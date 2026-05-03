
-- 1. Booking code generator
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  done BOOLEAN := false;
BEGIN
  IF NEW.ticket_code IS NOT NULL AND NEW.ticket_code <> '' THEN
    RETURN NEW;
  END IF;
  WHILE NOT done LOOP
    new_code := 'CSA-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    IF NOT EXISTS (SELECT 1 FROM public.registrations WHERE ticket_code = new_code) THEN
      done := true;
    END IF;
  END LOOP;
  NEW.ticket_code := new_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrations_ticket_code ON public.registrations;
CREATE TRIGGER trg_registrations_ticket_code
BEFORE INSERT ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_code();

-- Backfill existing registrations missing codes
UPDATE public.registrations
SET ticket_code = 'CSA-' || upper(substr(md5(id::text), 1, 6))
WHERE ticket_code IS NULL OR ticket_code = '';

-- 2. Payment aggregation trigger
CREATE OR REPLACE FUNCTION public.recalc_registration_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  reg_id UUID;
  paid_sum NUMERIC;
  cost NUMERIC;
  new_status TEXT;
BEGIN
  reg_id := COALESCE(NEW.registration_id, OLD.registration_id);
  IF reg_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO paid_sum
  FROM public.payments
  WHERE registration_id = reg_id AND verified = true;

  SELECT total_cost INTO cost FROM public.registrations WHERE id = reg_id;

  IF paid_sum <= 0 THEN
    new_status := 'pending';
  ELSIF cost IS NOT NULL AND paid_sum >= cost THEN
    new_status := 'paid';
  ELSE
    new_status := 'partial';
  END IF;

  UPDATE public.registrations
  SET total_paid = paid_sum,
      payment_status = new_status,
      ticket_issued = (new_status = 'paid'),
      updated_at = now()
  WHERE id = reg_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_recalc ON public.payments;
CREATE TRIGGER trg_payments_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.recalc_registration_totals();

-- Backfill totals
UPDATE public.registrations r
SET total_paid = COALESCE(s.total, 0),
    payment_status = CASE
      WHEN COALESCE(s.total, 0) <= 0 THEN 'pending'
      WHEN COALESCE(s.total, 0) >= r.total_cost THEN 'paid'
      ELSE 'partial'
    END,
    ticket_issued = (COALESCE(s.total, 0) >= r.total_cost AND r.total_cost > 0)
FROM (
  SELECT registration_id, SUM(amount) AS total
  FROM public.payments WHERE verified = true GROUP BY registration_id
) s
WHERE r.id = s.registration_id;

-- 3. Seed editable settings
INSERT INTO public.site_settings (key, value) VALUES
  ('hero_eyebrow', 'Construction Students Association'),
  ('hero_title', 'CSA Gala Dinner 2026'),
  ('hero_subtitle', 'Laying the First Stone: Honoring the Past, Empowering the Present, and Inspiring the Future of Construction'),
  ('hero_date', '05 June 2026'),
  ('hero_time', '7:00 PM – 11:00 PM'),
  ('hero_venue', 'Utalii House'),
  ('hero_countdown', '2026-06-05T19:00:00+03:00'),
  ('ticket_packages', '[{"id":"individual","name":"Individual","price":2650,"perks":["1 Seat","Dinner & Drinks","Networking"],"partial":true},{"id":"group5","name":"Group of 5","price":13000,"perks":["5 Seats","Dinner & Drinks","Networking"],"partial":false},{"id":"group10","name":"Group of 10","price":25500,"perks":["10 Seats","Dinner & Drinks","Priority Seating"],"partial":false},{"id":"corporate","name":"Corporate","price":3500,"perks":["1 Premium Seat","Brand Visibility","VIP Networking"],"partial":true}]')
ON CONFLICT (key) DO NOTHING;
