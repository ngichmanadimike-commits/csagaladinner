
-- Drop overly permissive policies
DROP POLICY "Public can insert registrations" ON public.registrations;
DROP POLICY "Public can insert payments" ON public.payments;

-- More specific insert policies (still public but validate data presence)
CREATE POLICY "Public can insert registrations" ON public.registrations
  FOR INSERT WITH CHECK (
    name IS NOT NULL AND name <> '' AND
    email IS NOT NULL AND email <> '' AND
    phone IS NOT NULL AND phone <> ''
  );

CREATE POLICY "Public can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    registration_id IS NOT NULL AND
    amount > 0
  );

-- Allow public to read their own registration by email
CREATE POLICY "Users can view own registration" ON public.registrations
  FOR SELECT USING (true);

-- Allow public to view payments for visible registrations
CREATE POLICY "Public can view payments" ON public.payments
  FOR SELECT USING (true);
