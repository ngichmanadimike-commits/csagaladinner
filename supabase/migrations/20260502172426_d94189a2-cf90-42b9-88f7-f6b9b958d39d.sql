
-- ===== PARTNERS =====
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active partners" ON public.partners FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER partners_updated BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SPONSORSHIPS =====
CREATE TABLE public.sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_name text NOT NULL,
  sponsor_email text,
  sponsor_phone text NOT NULL,
  num_students int NOT NULL DEFAULT 1 CHECK (num_students > 0),
  level text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL DEFAULT 'mpesa',
  mpesa_code text,
  payment_status text NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can submit sponsorships" ON public.sponsorships FOR INSERT WITH CHECK (sponsor_name <> '' AND sponsor_phone <> '' AND amount > 0);
CREATE POLICY "Admins manage sponsorships" ON public.sponsorships FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ===== PARTNER INQUIRIES =====
CREATE TABLE public.partner_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text NOT NULL,
  proposal text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can submit inquiries" ON public.partner_inquiries FOR INSERT WITH CHECK (name <> '' AND email <> '' AND company <> '');
CREATE POLICY "Admins manage inquiries" ON public.partner_inquiries FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ===== DOCUMENTS =====
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text,
  category text DEFAULT 'general',
  active boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view active documents" ON public.documents FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage documents" ON public.documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- ===== SPEAKERS =====
CREATE TABLE public.speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  bio text,
  photo_url text,
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view active speakers" ON public.speakers FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage speakers" ON public.speakers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER speakers_updated BEFORE UPDATE ON public.speakers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SITE SETTINGS (contact, socials) =====
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage site settings" ON public.site_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed defaults for contact + socials
INSERT INTO public.site_settings (key, value) VALUES
  ('contact_email', 'csa@students.tukenya.ac.ke'),
  ('contact_phone', '0758647130'),
  ('social_x', 'https://x.com/csa_tuk'),
  ('social_linkedin', 'https://www.linkedin.com/company/csatuk/'),
  ('social_instagram', 'https://www.instagram.com/csa_tuk'),
  ('social_tiktok', 'https://www.tiktok.com/@csa_tuk')
ON CONFLICT (key) DO NOTHING;

-- ===== Augment registrations & payments =====
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS quantity int NOT NULL DEFAULT 1;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'full';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS phone text;

-- Trigger: STK (mpesa-callback) source auto-verifies; manual stays pending
-- (Edge function will set source='stk' & verified=true on success)

-- ===== Documents storage bucket =====
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public view documents bucket" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Admins upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));

-- Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.partners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsorships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_inquiries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speakers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
