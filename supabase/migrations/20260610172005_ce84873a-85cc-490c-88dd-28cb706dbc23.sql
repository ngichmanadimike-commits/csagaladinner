CREATE OR REPLACE FUNCTION public.lookup_booking_by_contact(_email text, _phone text)
RETURNS TABLE(
  name text,
  ticket_code text,
  secure_ticket_token text,
  package_type text,
  payment_status text,
  ticket_issued boolean,
  total_cost numeric,
  total_paid numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name, ticket_code, secure_ticket_token, package_type, payment_status,
         ticket_issued, total_cost, total_paid
  FROM public.registrations
  WHERE lower(trim(email)) = lower(trim(_email))
    AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
  ORDER BY created_at DESC
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_booking_by_contact(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_contact(text, text) TO service_role;