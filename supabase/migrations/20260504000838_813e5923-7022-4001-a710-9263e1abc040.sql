DROP VIEW IF EXISTS public.code_payment_summary;
CREATE VIEW public.code_payment_summary
WITH (security_invoker = true) AS
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