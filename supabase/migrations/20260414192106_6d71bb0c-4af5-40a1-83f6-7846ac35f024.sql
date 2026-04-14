
-- Site content table for editable website sections
CREATE TABLE public.site_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT,
  body TEXT,
  image_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site content"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site content"
  ON public.site_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for site images
INSERT INTO storage.buckets (id, name, public) VALUES ('site-images', 'site-images', true);

CREATE POLICY "Anyone can view site images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-images');

CREATE POLICY "Admins can upload site images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'::app_role));
