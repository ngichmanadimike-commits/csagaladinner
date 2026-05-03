
ALTER TABLE public.sponsorships ADD COLUMN IF NOT EXISTS sponsor_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_sponsor_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  done BOOLEAN := false;
BEGIN
  IF NEW.sponsor_code IS NOT NULL AND NEW.sponsor_code <> '' THEN
    RETURN NEW;
  END IF;
  WHILE NOT done LOOP
    new_code := 'SPN-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    IF NOT EXISTS (SELECT 1 FROM public.sponsorships WHERE sponsor_code = new_code) THEN
      done := true;
    END IF;
  END LOOP;
  NEW.sponsor_code := new_code;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sponsorships_code ON public.sponsorships;
CREATE TRIGGER trg_sponsorships_code
BEFORE INSERT ON public.sponsorships
FOR EACH ROW EXECUTE FUNCTION public.generate_sponsor_code();

-- Backfill existing
UPDATE public.sponsorships
SET sponsor_code = 'SPN-' || upper(substr(md5(id::text), 1, 6))
WHERE sponsor_code IS NULL;
