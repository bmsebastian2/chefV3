-- ─────────────────────────────────────────────────────────────────────────────
-- Storage policies for "menu-images" bucket
--
-- Run AFTER creating the bucket manually in Supabase Dashboard:
--   Storage → New bucket → Name: "menu-images" → Public: ON
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow authenticated users to upload to their own folder ({userId}/...)
DROP POLICY IF EXISTS "Chef uploads own menu images" ON storage.objects;
CREATE POLICY "Chef uploads own menu images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access (images are shown to clients on the platform)
DROP POLICY IF EXISTS "Menu images publicly readable" ON storage.objects;
CREATE POLICY "Menu images publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'menu-images');

-- Allow authenticated users to update their own files
DROP POLICY IF EXISTS "Chef updates own menu images" ON storage.objects;
CREATE POLICY "Chef updates own menu images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Chef deletes own menu images" ON storage.objects;
CREATE POLICY "Chef deletes own menu images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
