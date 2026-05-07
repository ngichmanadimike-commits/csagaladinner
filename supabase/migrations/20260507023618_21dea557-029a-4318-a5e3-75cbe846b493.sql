
-- Updated validate_promo_code: enforces single-use per email/phone and first-installment-only
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  _code text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _registration_id uuid DEFAULT NULL,
  _is_first_installment boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  p public.promotions;
  existed boolean;
  used_already boolean;
BEGIN
  IF NOT _is_first_installment THEN
    RETURN jsonb_build_object('valid', false, 'reason','installment_not_first');
  END IF;

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

  -- single-use per customer (email or phone or registration)
  SELECT EXISTS(
    SELECT 1 FROM public.promo_redemptions
    WHERE status = 'applied'
      AND code = upper(trim(_code))
      AND (
        (_email IS NOT NULL AND email = _email)
        OR (_phone IS NOT NULL AND phone = _phone)
        OR (_registration_id IS NOT NULL AND registration_id = _registration_id)
      )
  ) INTO used_already;
  IF used_already THEN
    RETURN jsonb_build_object('valid', false, 'reason','already_used');
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
$function$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, text, text, uuid, boolean) TO anon, authenticated;

-- Super-admin danger zone: wipe data with explicit confirmation token
CREATE OR REPLACE FUNCTION public.admin_wipe_data(_scope text, _confirm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted jsonb := '{}'::jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden: super_admin only';
  END IF;
  IF _confirm <> 'DELETE' THEN
    RAISE EXCEPTION 'confirmation token must equal DELETE';
  END IF;

  IF _scope IN ('payments','all') THEN
    DELETE FROM public.payments;
    deleted := deleted || jsonb_build_object('payments', true);
  END IF;
  IF _scope IN ('registrations','all') THEN
    DELETE FROM public.payments;
    DELETE FROM public.promo_redemptions WHERE registration_id IS NOT NULL;
    DELETE FROM public.registrations;
    deleted := deleted || jsonb_build_object('registrations', true);
  END IF;
  IF _scope IN ('promo_redemptions','promos','all') THEN
    DELETE FROM public.promo_redemptions;
    deleted := deleted || jsonb_build_object('promo_redemptions', true);
  END IF;
  IF _scope IN ('promos','all') THEN
    DELETE FROM public.promotions;
    deleted := deleted || jsonb_build_object('promotions', true);
  END IF;
  IF _scope IN ('sponsorships','all') THEN
    DELETE FROM public.sponsorships;
    deleted := deleted || jsonb_build_object('sponsorships', true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'deleted', deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_wipe_data(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_wipe_data(text, text) TO authenticated;
