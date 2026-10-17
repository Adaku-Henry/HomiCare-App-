-- HomiCare profile + storage foundation
-- This migration is intentionally idempotent and is designed to support the current frontend contract.
-- It creates the profile table, the storage bucket, and ensures the provider table has the fields the app reads.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

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

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_id uuid;

-- Ensure the public_id is unique and populated.
UPDATE public.profiles
SET public_id = gen_random_uuid()
WHERE public_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN public_id SET NOT NULL,
  ALTER COLUMN public_id SET DEFAULT gen_random_uuid();

-- Ensure provider table has the columns expected by the current frontend contract.
CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  professional_title text NOT NULL DEFAULT '',
  avatar_url text,
  cover_url text,
  bio text,
  primary_service_category_id uuid,
  location text NOT NULL DEFAULT '',
  service_radius_km int NOT NULL DEFAULT 30,
  availability_status text NOT NULL DEFAULT 'available',
  identity_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  skills_verified boolean NOT NULL DEFAULT false,
  certification_verified boolean NOT NULL DEFAULT false,
  business_verified boolean NOT NULL DEFAULT false,
  portfolio_verified boolean NOT NULL DEFAULT false,
  rating numeric(2,1) NOT NULL DEFAULT 0.0,
  review_count int NOT NULL DEFAULT 0,
  completed_jobs int NOT NULL DEFAULT 0,
  years_experience int NOT NULL DEFAULT 0,
  response_rate int NOT NULL DEFAULT 0,
  response_time_min int NOT NULL DEFAULT 0,
  on_time_rate int NOT NULL DEFAULT 0,
  starting_price int NOT NULL DEFAULT 0,
  total_earnings bigint NOT NULL DEFAULT 0,
  member_since date NOT NULL DEFAULT CURRENT_DATE,
  is_business boolean NOT NULL DEFAULT false,
  business_name text,
  provider_status text NOT NULL DEFAULT 'pending'
    CHECK (provider_status IN ('pending', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS professional_title text;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS starting_price int;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS provider_status text;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS identity_verified boolean;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS phone_verified boolean;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS skills_verified boolean;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS certification_verified boolean;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS business_verified boolean;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS portfolio_verified boolean;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS rating numeric(2,1);
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS review_count int;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS completed_jobs int;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS years_experience int;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS response_rate int;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS response_time_min int;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS on_time_rate int;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS is_business boolean;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS business_name text;

UPDATE public.providers
SET full_name = COALESCE(full_name, ''),
    professional_title = COALESCE(professional_title, ''),
    location = COALESCE(location, ''),
    starting_price = COALESCE(starting_price, 0),
    provider_status = COALESCE(provider_status, 'pending'),
    identity_verified = COALESCE(identity_verified, false),
    phone_verified = COALESCE(phone_verified, false),
    skills_verified = COALESCE(skills_verified, false),
    certification_verified = COALESCE(certification_verified, false),
    business_verified = COALESCE(business_verified, false),
    portfolio_verified = COALESCE(portfolio_verified, false),
    rating = COALESCE(rating, 0.0),
    review_count = COALESCE(review_count, 0),
    completed_jobs = COALESCE(completed_jobs, 0),
    years_experience = COALESCE(years_experience, 0),
    response_rate = COALESCE(response_rate, 0),
    response_time_min = COALESCE(response_time_min, 0),
    on_time_rate = COALESCE(on_time_rate, 0),
    is_business = COALESCE(is_business, false)
WHERE full_name IS NULL
   OR professional_title IS NULL
   OR location IS NULL
   OR starting_price IS NULL
   OR provider_status IS NULL
   OR identity_verified IS NULL
   OR phone_verified IS NULL
   OR skills_verified IS NULL
   OR certification_verified IS NULL
   OR business_verified IS NULL
   OR portfolio_verified IS NULL
   OR rating IS NULL
   OR review_count IS NULL
   OR completed_jobs IS NULL
   OR years_experience IS NULL
   OR response_rate IS NULL
   OR response_time_min IS NULL
   OR on_time_rate IS NULL
   OR is_business IS NULL;

-- Profile creation trigger for new auth users.
CREATE OR REPLACE FUNCTION public.create_homicare_profile_for_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone_private, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'Uganda')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_homicare_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_homicare_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_homicare_profile_for_auth_user();

-- RLS: users can manage only their own profile.
DROP POLICY IF EXISTS "profiles_owner_read" ON public.profiles;
CREATE POLICY "profiles_owner_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "profile_media_owner_read" ON storage.objects;
CREATE POLICY "profile_media_owner_read" ON storage.objects
  FOR SELECT TO authenticated
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

-- Provider owner access: the frontend already writes to public.providers based on user_id.
DROP POLICY IF EXISTS "provider_owner_read" ON public.providers;
CREATE POLICY "provider_owner_read" ON public.providers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "provider_owner_insert" ON public.providers;
CREATE POLICY "provider_owner_insert" ON public.providers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "provider_owner_update" ON public.providers;
CREATE POLICY "provider_owner_update" ON public.providers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public provider discovery is allowed for active providers only.
DROP POLICY IF EXISTS "public_read_active_providers" ON public.providers;
CREATE POLICY "public_read_active_providers" ON public.providers
  FOR SELECT TO anon, authenticated
  USING (provider_status = 'active' OR provider_status IS NULL);

-- Backfill user profile rows for already created auth users.
INSERT INTO public.profiles (user_id, display_name, phone_private, country)
SELECT
  auth.users.id,
  COALESCE(auth.users.raw_user_meta_data->>'full_name', auth.users.raw_user_meta_data->>'fullName', ''),
  COALESCE(auth.users.raw_user_meta_data->>'phone', ''),
  COALESCE(auth.users.raw_user_meta_data->>'country', 'Uganda')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
