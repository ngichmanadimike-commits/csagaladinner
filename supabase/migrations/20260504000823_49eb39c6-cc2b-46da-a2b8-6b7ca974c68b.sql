ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS secure_ticket_token TEXT UNIQUE;
ALTER TABLE public.sponsorships ADD COLUMN IF NOT EXISTS secure_ticket_token TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- 64 hex chars from two md5 rounds with random + clock entropy
  RETURN md5(random()::text || clock_timestamp()::text || random()::text)
      || md5(random()::text || clock_timestamp()::text || random()::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_registration_secure_token()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.secure_ticket_token IS NULL OR NEW.secure_ticket_token = '' THEN
    LOOP
      NEW.secure_ticket_token := generate_secure_token();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.registrations WHERE secure_ticket_token = NEW.secure_ticket_token);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sponsorship_secure_token()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.secure_ticket_token IS NULL OR NEW.secure_ticket_token = '' THEN
    LOOP
      NEW.secure_ticket_token := generate_secure_token();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.sponsorships WHERE secure_ticket_token = NEW.secure_ticket_token);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reg_secure_token ON public.registrations;
CREATE TRIGGER trg_reg_secure_token BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_registration_secure_token();

DROP TRIGGER IF EXISTS trg_spn_secure_token ON public.sponsorships;
CREATE TRIGGER trg_spn_secure_token BEFORE INSERT ON public.sponsorships
  FOR EACH ROW EXECUTE FUNCTION public.set_sponsorship_secure_token();

UPDATE public.registrations SET secure_ticket_token = generate_secure_token() WHERE secure_ticket_token IS NULL;
UPDATE public.sponsorships SET secure_ticket_token = generate_secure_token() WHERE secure_ticket_token IS NULL;

DROP TRIGGER IF EXISTS trg_reg_ticket_code ON public.registrations;
CREATE TRIGGER trg_reg_ticket_code BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_code();

DROP TRIGGER IF EXISTS trg_spn_sponsor_code ON public.sponsorships;
CREATE TRIGGER trg_spn_sponsor_code BEFORE INSERT ON public.sponsorships
  FOR EACH ROW EXECUTE FUNCTION public.generate_sponsor_code();

DROP TRIGGER IF EXISTS trg_payments_recalc ON public.payments;
CREATE TRIGGER trg_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.recalc_registration_totals();

CREATE TABLE IF NOT EXISTS public.ticket_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  capacity INTEGER,
  partial_allowed BOOLEAN NOT NULL DEFAULT false,
  installments JSONB NOT NULL DEFAULT '[]'::jsonb,
  installment_mode TEXT NOT NULL DEFAULT 'amount',
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone view active packages" ON public.ticket_packages
  FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage packages" ON public.ticket_packages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_ticket_packages_updated BEFORE UPDATE ON public.ticket_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ticket_packages (slug, name, price, perks, partial_allowed, installments, installment_mode, display_order)
SELECT * FROM (VALUES
  ('individual', 'Individual', 2650::numeric, '["1 Seat","Dinner & Drinks","Networking"]'::jsonb, true,  '[1050,800,800]'::jsonb, 'amount', 1),
  ('group5',     'Group of 5', 13000::numeric,'["5 Seats","Dinner & Drinks","Networking"]'::jsonb,  false, '[]'::jsonb,             'amount', 2),
  ('group10',    'Group of 10',25500::numeric,'["10 Seats","Dinner & Drinks","Priority Seating"]'::jsonb, false, '[]'::jsonb,        'amount', 3),
  ('corporate',  'Corporate',  3500::numeric, '["1 Premium Seat","Brand Visibility","VIP Networking"]'::jsonb, true, '[1500,1000,1000]'::jsonb, 'amount', 4)
) AS v(slug,name,price,perks,partial_allowed,installments,installment_mode,display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.ticket_packages);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  admin_name TEXT,
  admin_email TEXT,
  role TEXT,
  branch TEXT,
  action_type TEXT NOT NULL,
  action_description TEXT,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  device_info TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aal_admin ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_aal_time ON public.admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_action ON public.admin_activity_logs(action_type);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated insert own logs" ON public.admin_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Super admins view logs" ON public.admin_activity_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE VIEW public.code_payment_summary AS
SELECT
  r.id AS registration_id,
  r.ticket_code,
  r.name,
  r.email,
  r.phone,
  r.package_type,
  r.quantity,
  r.total_cost,
  r.total_paid,
  GREATEST(r.total_cost - r.total_paid, 0) AS balance,
  r.payment_status,
  r.ticket_issued,
  r.secure_ticket_token,
  r.created_at,
  (SELECT COUNT(*) FROM public.payments p WHERE p.registration_id = r.id AND p.verified) AS verified_payment_count,
  (SELECT MAX(p.verified_at) FROM public.payments p WHERE p.registration_id = r.id AND p.verified) AS last_paid_at
FROM public.registrations r;

GRANT SELECT ON public.code_payment_summary TO authenticated, anon;