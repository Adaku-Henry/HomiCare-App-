CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  display_name text NOT NULL DEFAULT '',
  phone_private text NOT NULL DEFAULT '',
  date_of_birth text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  marital_status text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  alternate_phone_private text NOT NULL DEFAULT '',
  whatsapp_private text NOT NULL DEFAULT '',
  preferred_contact text NOT NULL DEFAULT 'Phone call',
  country text NOT NULL DEFAULT 'Uganda',
  city text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  address_private text NOT NULL DEFAULT '',
  avatar_url text,
  cover_url text,
  website text NOT NULL DEFAULT '',
  linkedin text NOT NULL DEFAULT '',
  facebook text NOT NULL DEFAULT '',
  occupation text NOT NULL DEFAULT '',
  household_interests text NOT NULL DEFAULT '',
  profile_visibility text NOT NULL DEFAULT 'private'
    CHECK (profile_visibility IN ('public', 'members', 'private')),
  show_phone boolean NOT NULL DEFAULT false,
  show_location boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_owner_read" ON public.profiles;
CREATE POLICY "profiles_owner_read" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

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
  FOR SELECT TO authenticated USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.public_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "profile_media_owner_insert" ON storage.objects;
CREATE POLICY "profile_media_owner_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.public_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "profile_media_owner_update" ON storage.objects;
CREATE POLICY "profile_media_owner_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.public_id::text = (storage.foldername(name))[1]
    )
  ) WITH CHECK (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.public_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "profile_media_owner_delete" ON storage.objects;
CREATE POLICY "profile_media_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.public_id::text = (storage.foldername(name))[1]
    )
  );