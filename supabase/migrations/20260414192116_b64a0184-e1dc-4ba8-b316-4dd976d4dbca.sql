
-- Drop the overly broad select policy and replace with a path-based one
DROP POLICY "Anyone can view site images" ON storage.objects;

CREATE POLICY "Anyone can view site images by path"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-images' AND (auth.role() = 'authenticated' OR name IS NOT NULL));
