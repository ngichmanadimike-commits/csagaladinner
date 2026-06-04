
-- 1. Admin activity logs: only admins/super admins may insert
DROP POLICY IF EXISTS "Authenticated insert own logs" ON public.admin_activity_logs;
CREATE POLICY "Admins insert own logs"
ON public.admin_activity_logs
FOR INSERT TO authenticated
WITH CHECK (
  admin_id = auth.uid()
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
);

-- 2. Drop public SELECT on registrations and payments
DROP POLICY IF EXISTS "Users can view own registration" ON public.registrations;
DROP POLICY IF EXISTS "Public can view payments" ON public.payments;

-- 3. Secure public lookup RPCs (no broad table reads)
CREATE OR REPLACE FUNCTION public.lookup_registration_by_code(_code text)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  package_type text,
  total_cost numeric,
  total_paid numeric,
  payment_status text,
  ticket_issued boolean,
  ticket_code text,
  secure_ticket_token text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, email, package_type, total_cost, total_paid, payment_status,
         ticket_issued, ticket_code, secure_ticket_token
  FROM public.registrations
  WHERE ticket_code = upper(trim(_code))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.lookup_registration_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_registration_by_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_sponsorship_by_code(_code text)
RETURNS TABLE (
  id uuid,
  sponsor_name text,
  sponsor_email text,
  sponsor_phone text,
  num_students integer,
  level text,
  amount numeric,
  verified boolean,
  payment_status text,
  sponsor_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, sponsor_name, sponsor_email, sponsor_phone, num_students, level,
         amount, verified, payment_status, sponsor_code
  FROM public.sponsorships
  WHERE sponsor_code = upper(trim(_code))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.lookup_sponsorship_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_sponsorship_by_code(text) TO anon, authenticated;

-- 4. Promotions: restrict SELECT to admins; public uses get_active_promotion()
DROP POLICY IF EXISTS "Public read active promotions" ON public.promotions;
CREATE POLICY "Admins read promotions"
ON public.promotions
FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

-- 5. Realtime: remove PII tables from publication
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.registrations; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.payments; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.partner_inquiries; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.sponsorships; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 6. Revoke unnecessary EXECUTE on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
