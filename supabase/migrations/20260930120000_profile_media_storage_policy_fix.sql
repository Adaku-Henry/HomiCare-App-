INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "profile_media_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_media_visibility_read" ON storage.objects;
DROP POLICY IF EXISTS "profile_media_public_read" ON storage.objects;
CREATE POLICY "profile_media_visibility_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'profile-media'
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.user_id = auth.uid()
          AND (
            profiles.public_id::text = (storage.foldername(name))[1]
            OR profiles.user_id::text = (storage.foldername(name))[1]
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.public_profiles
        WHERE public_profiles.public_id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS "profile_media_owner_insert" ON storage.objects;
CREATE POLICY "profile_media_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND (
          profiles.public_id::text = (storage.foldername(name))[1]
          OR profiles.user_id::text = (storage.foldername(name))[1]
        )
    )
  );

DROP POLICY IF EXISTS "profile_media_owner_update" ON storage.objects;
CREATE POLICY "profile_media_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND (
          profiles.public_id::text = (storage.foldername(name))[1]
          OR profiles.user_id::text = (storage.foldername(name))[1]
        )
    )
  )
  WITH CHECK (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND (
          profiles.public_id::text = (storage.foldername(name))[1]
          OR profiles.user_id::text = (storage.foldername(name))[1]
        )
    )
  );

DROP POLICY IF EXISTS "profile_media_owner_delete" ON storage.objects;
CREATE POLICY "profile_media_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND (
          profiles.public_id::text = (storage.foldername(name))[1]
          OR profiles.user_id::text = (storage.foldername(name))[1]
        )
    )
  );