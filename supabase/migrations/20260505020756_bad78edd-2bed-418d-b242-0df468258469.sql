
-- PROMOTIONS
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  eligible_users TEXT NOT NULL DEFAULT 'all' CHECK (eligible_users IN ('all','new_users','specific_segment')),
  segment_tag TEXT,
  description TEXT,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotions_active ON public.promotions (is_active, deleted_at, start_at, expires_at);

CREATE OR REPLACE FUNCTION public.normalize_promo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  IF NEW.expires_at <= NEW.start_at THEN
    RAISE EXCEPTION 'expires_at must be after start_at';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_promo
BEFORE INSERT OR UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.normalize_promo();

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active promotions"
ON public.promotions FOR SELECT TO public
USING (
  deleted_at IS NULL AND is_active = true
  AND now() BETWEEN start_at AND expires_at
);

CREATE POLICY "Admins manage promotions"
ON public.promotions FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- PROMO REDEMPTIONS (analytics + uniqueness)
CREATE TABLE public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  registration_id UUID,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','rejected')),
  reason TEXT,
  discount_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_promo_redemptions_code ON public.promo_redemptions(code);
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert redemptions"
ON public.promo_redemptions FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins read redemptions"
ON public.promo_redemptions FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- REFERRALS
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID,
  referrer_email TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  reward_type TEXT NOT NULL DEFAULT 'percentage' CHECK (reward_type IN ('percentage','fixed','credit')),
  reward_value NUMERIC NOT NULL DEFAULT 0,
  max_referrals INTEGER,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referral"
ON public.referrals FOR SELECT TO authenticated
USING (referrer_user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "Admins manage referrals"
ON public.referrals FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "Users create own referral"
ON public.referrals FOR INSERT TO authenticated
WITH CHECK (referrer_user_id = auth.uid());

-- REFERRAL USAGE
CREATE TABLE public.referral_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  referrer_user_id UUID,
  referred_user_id UUID,
  referred_email TEXT,
  ip_address TEXT,
  device_fingerprint TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','rewarded','rejected')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_usage_code ON public.referral_usage(referral_code);
ALTER TABLE public.referral_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert referral usage"
ON public.referral_usage FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins read referral usage"
ON public.referral_usage FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- ACTIVE PROMOTION HELPER
CREATE OR REPLACE FUNCTION public.get_active_promotion()
RETURNS SETOF public.promotions
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM public.promotions
  WHERE deleted_at IS NULL
    AND is_active = true
    AND now() BETWEEN start_at AND expires_at
    AND (max_uses IS NULL OR used_count < max_uses)
  ORDER BY discount_value DESC, expires_at ASC
  LIMIT 1;
$$;

-- VALIDATION RPC (case-insensitive, server-authoritative)
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code TEXT, _email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE p public.promotions; existed BOOLEAN;
BEGIN
  SELECT * INTO p FROM public.promotions
  WHERE code = upper(trim(_code)) AND deleted_at IS NULL
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason','not_found');
  END IF;
  IF NOT p.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason','inactive');
  END IF;
  IF now() < p.start_at THEN
    RETURN jsonb_build_object('valid', false, 'reason','not_started');
  END IF;
  IF now() > p.expires_at THEN
    RETURN jsonb_build_object('valid', false, 'reason','expired');
  END IF;
  IF p.max_uses IS NOT NULL AND p.used_count >= p.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason','max_uses');
  END IF;
  IF p.eligible_users = 'new_users' AND _email IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.registrations WHERE email = _email) INTO existed;
    IF existed THEN
      RETURN jsonb_build_object('valid', false, 'reason','not_new_user');
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'id', p.id,
    'title', p.title,
    'code', p.code,
    'discount_type', p.discount_type,
    'discount_value', p.discount_value,
    'expires_at', p.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_promotion() TO anon, authenticated;
