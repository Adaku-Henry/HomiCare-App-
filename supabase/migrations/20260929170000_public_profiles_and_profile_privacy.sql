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
DROP POLICY IF EXISTS "profiles_owner_read" ON public.profiles;
CREATE POLICY "profiles_owner_read" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

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
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
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
  FOR EACH ROW EXECUTE FUNCTION public.create_homicare_profile_for_auth_user();

INSERT INTO public.profiles (
  user_id, display_name, phone_private, date_of_birth, gender, marital_status,
  bio, alternate_phone_private, whatsapp_private, preferred_contact, country,
  city, district, address_private, avatar_url, cover_url, website, linkedin,
  facebook, occupation, household_interests, profile_visibility, show_phone,
  show_location
)
SELECT
  users.id,
  COALESCE(users.raw_user_meta_data->>'fullName', users.raw_user_meta_data->>'full_name', ''),
  COALESCE(users.raw_user_meta_data->>'phone', ''),
  COALESCE(users.raw_user_meta_data->>'dateOfBirth', ''),
  COALESCE(users.raw_user_meta_data->>'gender', ''),
  COALESCE(users.raw_user_meta_data->>'maritalStatus', ''),
  COALESCE(users.raw_user_meta_data->>'bio', ''),
  COALESCE(users.raw_user_meta_data->>'alternatePhone', ''),
  COALESCE(users.raw_user_meta_data->>'whatsappNumber', ''),
  COALESCE(users.raw_user_meta_data->>'preferredContact', 'Phone call'),
  COALESCE(users.raw_user_meta_data->>'country', 'Uganda'),
  COALESCE(users.raw_user_meta_data->>'city', ''),
  COALESCE(users.raw_user_meta_data->>'district', ''),
  COALESCE(users.raw_user_meta_data->>'address', ''),
  NULLIF(users.raw_user_meta_data->>'photoUrl', ''),
  NULLIF(users.raw_user_meta_data->>'coverUrl', ''),
  COALESCE(users.raw_user_meta_data->>'website', ''),
  COALESCE(users.raw_user_meta_data->>'linkedin', ''),
  COALESCE(users.raw_user_meta_data->>'facebook', ''),
  COALESCE(users.raw_user_meta_data->>'occupation', ''),
  COALESCE(users.raw_user_meta_data->>'interests', ''),
  CASE WHEN users.raw_user_meta_data->'privacy'->>'publicProfile' = 'true' THEN 'public' ELSE 'private' END,
  COALESCE(users.raw_user_meta_data->'privacy'->>'showPhone' = 'true', false),
  COALESCE(users.raw_user_meta_data->'privacy'->>'showLocation' = 'true', false)
FROM auth.users AS users
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS provider_status text NOT NULL DEFAULT 'active'
    CHECK (provider_status IN ('pending', 'active', 'suspended'));
ALTER TABLE public.providers ALTER COLUMN provider_status SET DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_providers_status_rating
  ON public.providers(provider_status, rating DESC);

DROP POLICY IF EXISTS "public_read_providers" ON public.providers;
REVOKE SELECT ON public.providers FROM anon;
GRANT SELECT ON public.providers TO authenticated;
DROP POLICY IF EXISTS "owner_update_provider" ON public.providers;
DROP POLICY IF EXISTS "auth_insert_provider" ON public.providers;
DROP POLICY IF EXISTS "provider_owner_read" ON public.providers;
CREATE POLICY "provider_owner_read" ON public.providers
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "provider_owner_update" ON public.providers;
CREATE POLICY "provider_owner_update" ON public.providers
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "provider_owner_insert" ON public.providers;
CREATE POLICY "provider_owner_insert" ON public.providers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_provider_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin'
    AND ROW(
      NEW.user_id, NEW.provider_status, NEW.identity_verified, NEW.phone_verified,
      NEW.skills_verified, NEW.certification_verified, NEW.business_verified,
      NEW.portfolio_verified, NEW.rating, NEW.review_count, NEW.completed_jobs,
      NEW.total_earnings
    ) IS DISTINCT FROM ROW(
      OLD.user_id, OLD.provider_status, OLD.identity_verified, OLD.phone_verified,
      OLD.skills_verified, OLD.certification_verified, OLD.business_verified,
      OLD.portfolio_verified, OLD.rating, OLD.review_count, OLD.completed_jobs,
      OLD.total_earnings
    ) THEN
    RAISE EXCEPTION 'Provider verification, publication, and performance fields require HomiCare review';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_provider_review_fields ON public.providers;
CREATE TRIGGER protect_provider_review_fields
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.protect_provider_review_fields();

REVOKE ALL ON FUNCTION public.protect_provider_review_fields() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true)
AS
SELECT
  profiles.public_id,
  CASE WHEN profiles.profile_visibility = 'public' THEN profiles.display_name
       ELSE split_part(profiles.display_name, ' ', 1) END AS display_name,
  profiles.avatar_url,
  profiles.bio,
  CASE WHEN profiles.show_location THEN profiles.city END AS city,
  CASE WHEN profiles.show_location THEN profiles.district END AS district,
  profiles.country,
  CASE WHEN profiles.show_phone THEN profiles.phone_private END AS phone
FROM public.profiles AS profiles
WHERE profiles.profile_visibility = 'public'
   OR (profiles.profile_visibility = 'members' AND auth.uid() IS NOT NULL);

CREATE OR REPLACE VIEW public.public_provider_profiles
WITH (security_barrier = true)
AS
SELECT
  providers.id,
  COALESCE(NULLIF(providers.business_name, ''), NULLIF(profiles.display_name, ''), providers.full_name) AS full_name,
  providers.professional_title,
  COALESCE(profiles.avatar_url, providers.avatar_url) AS avatar_url,
  COALESCE(profiles.cover_url, providers.cover_url) AS cover_url,
  COALESCE(NULLIF(providers.bio, ''), NULLIF(profiles.bio, '')) AS bio,
  providers.primary_service_category_id,
  CASE WHEN profiles.user_id IS NULL THEN providers.location
       WHEN profiles.show_location AND profiles.city <> ''
         THEN concat_ws(', ', profiles.city, NULLIF(profiles.district, ''))
       ELSE 'Service area shared after booking' END AS location,
  providers.service_radius_km,
  providers.availability_status,
  providers.identity_verified,
  providers.phone_verified,
  providers.skills_verified,
  providers.certification_verified,
  providers.business_verified,
  providers.portfolio_verified,
  providers.rating,
  providers.review_count,
  providers.completed_jobs,
  providers.years_experience,
  providers.response_rate,
  providers.response_time_min,
  providers.on_time_rate,
  providers.starting_price,
  providers.member_since,
  providers.is_business,
  providers.business_name,
  providers.created_at,
  CASE WHEN profiles.show_phone THEN profiles.phone_private END AS public_phone
FROM public.providers AS providers
LEFT JOIN public.profiles AS profiles ON profiles.user_id = providers.user_id
WHERE providers.provider_status = 'active'
  AND (
    profiles.profile_visibility = 'public'
    OR (profiles.profile_visibility = 'members' AND auth.uid() IS NOT NULL)
    OR (providers.user_id IS NULL AND profiles.user_id IS NULL)
  );

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT SELECT ON public.public_provider_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "profile_media_public_read" ON storage.objects;
CREATE POLICY "profile_media_visibility_read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (
    bucket_id = 'profile-media'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.public_id::text = (storage.foldername(name))[1]
          AND (
            profiles.profile_visibility = 'public'
            OR (profiles.profile_visibility = 'members' AND auth.uid() IS NOT NULL)
            OR profiles.user_id = auth.uid()
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id::text = (storage.foldername(name))[1]
          AND (
            profiles.user_id = auth.uid()
            OR profiles.profile_visibility = 'public'
            OR (profiles.profile_visibility = 'members' AND auth.uid() IS NOT NULL)
          )
      )
    )
  );

DROP POLICY IF EXISTS "profile_media_owner_insert" ON storage.objects;
CREATE POLICY "profile_media_owner_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.public_id::text = (storage.foldername(name))[1]
        AND profiles.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "profile_media_owner_update" ON storage.objects;
CREATE POLICY "profile_media_owner_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.public_id::text = (storage.foldername(name))[1]
        AND profiles.user_id = auth.uid()
    )
  ) WITH CHECK (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.public_id::text = (storage.foldername(name))[1]
        AND profiles.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "profile_media_owner_delete" ON storage.objects;
CREATE POLICY "profile_media_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'profile-media'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND (profiles.public_id::text = (storage.foldername(name))[1] OR profiles.user_id::text = (storage.foldername(name))[1])
    )
  );

CREATE OR REPLACE VIEW public.admin_provider_review_queue
WITH (security_barrier = true)
AS
SELECT
  providers.id,
  COALESCE(NULLIF(providers.business_name, ''), NULLIF(profiles.display_name, ''), providers.full_name) AS full_name,
  providers.professional_title,
  providers.location,
  providers.primary_service_category_id,
  providers.identity_verified,
  providers.phone_verified,
  providers.skills_verified,
  providers.certification_verified,
  providers.business_verified,
  providers.portfolio_verified,
  providers.provider_status,
  providers.created_at
FROM public.providers AS providers
LEFT JOIN public.profiles AS profiles ON profiles.user_id = providers.user_id
WHERE auth.jwt()->'app_metadata'->>'role' = 'admin';

GRANT SELECT ON public.admin_provider_review_queue TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_provider_status(p_provider_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;
  IF p_status NOT IN ('pending', 'active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid provider status';
  END IF;
  UPDATE public.providers SET provider_status = p_status WHERE id = p_provider_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_provider_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_provider_status(uuid, text) TO authenticated;

CREATE OR REPLACE VIEW public.public_provider_reviews
WITH (security_barrier = true)
AS
SELECT
  reviews.id,
  reviews.provider_id,
  split_part(reviews.customer_name, ' ', 1) AS customer_name,
  reviews.rating_quality,
  reviews.rating_professionalism,
  reviews.rating_communication,
  reviews.rating_timeliness,
  reviews.rating_value,
  reviews.rating_cleanliness,
  reviews.overall_rating,
  reviews.comment,
  reviews.would_hire_again,
  reviews.created_at
FROM public.reviews AS reviews
WHERE EXISTS (
  SELECT 1 FROM public.public_provider_profiles
  WHERE public_provider_profiles.id = reviews.provider_id
);

CREATE OR REPLACE VIEW public.public_provider_portfolio
WITH (security_barrier = true)
AS
SELECT
  projects.id,
  projects.provider_id,
  projects.title,
  projects.category,
  projects.description,
  projects.before_image_url,
  projects.during_image_url,
  projects.after_image_url,
  projects.completion_date,
  projects.services_performed,
  projects.customer_rating,
  true AS customer_confirmed,
  projects.created_at
FROM public.portfolio_projects AS projects
WHERE projects.customer_confirmed
  AND EXISTS (
    SELECT 1 FROM public.public_provider_profiles
    WHERE public_provider_profiles.id = projects.provider_id
  );

GRANT SELECT ON public.public_provider_reviews TO anon, authenticated;
GRANT SELECT ON public.public_provider_portfolio TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
REVOKE SELECT ON public.reviews FROM anon, authenticated;
DROP POLICY IF EXISTS "auth_insert_review" ON public.reviews;
DROP POLICY IF EXISTS "auth_update_review" ON public.reviews;
CREATE POLICY "customer_create_review" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.customer_id = auth.uid()
        AND bookings.provider_id = reviews.provider_id
        AND bookings.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "public_read_provider_services" ON public.provider_services;
CREATE POLICY "public_read_provider_services" ON public.provider_services
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.public_provider_profiles
    WHERE public_provider_profiles.id = provider_services.provider_id
  ));
DROP POLICY IF EXISTS "owner_manage_provider_services" ON public.provider_services;
CREATE POLICY "owner_manage_provider_services" ON public.provider_services
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers
    WHERE providers.id = provider_services.provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers
    WHERE providers.id = provider_services.provider_id AND providers.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.public_provider_profiles
    WHERE public_provider_profiles.id = reviews.provider_id
  ));

DROP POLICY IF EXISTS "public_read_portfolio" ON public.portfolio_projects;
REVOKE SELECT ON public.portfolio_projects FROM anon, authenticated;
DROP POLICY IF EXISTS "owner_manage_portfolio" ON public.portfolio_projects;
CREATE POLICY "owner_manage_portfolio" ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers
    WHERE providers.id = portfolio_projects.provider_id AND providers.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers
    WHERE providers.id = portfolio_projects.provider_id AND providers.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "availability_public_read" ON public.provider_availability;
CREATE POLICY "availability_public_read" ON public.provider_availability
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.public_provider_profiles
    WHERE public_provider_profiles.id = provider_availability.provider_id
  ));

DROP POLICY IF EXISTS "provider_time_off_public_read" ON public.provider_time_off;
CREATE POLICY "provider_time_off_public_read" ON public.provider_time_off
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.public_provider_profiles
    WHERE public_provider_profiles.id = provider_time_off.provider_id
  ));

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
UPDATE public.messages AS messages
SET customer_id = bookings.customer_id
FROM public.bookings AS bookings
WHERE messages.customer_id IS NULL
  AND bookings.customer_id IS NOT NULL
  AND messages.provider_id = bookings.provider_id
  AND lower(trim(messages.customer_name)) = lower(trim(bookings.customer_name));
UPDATE public.messages AS messages
SET customer_id = profiles.user_id
FROM public.profiles AS profiles
WHERE messages.customer_id IS NULL
  AND lower(trim(messages.customer_name)) = lower(trim(profiles.display_name));
CREATE INDEX IF NOT EXISTS idx_messages_participant_thread
  ON public.messages(customer_id, provider_id, created_at);
DROP POLICY IF EXISTS "public_read_messages" ON public.messages;
REVOKE SELECT ON public.messages FROM anon;
GRANT SELECT ON public.messages TO authenticated;
DROP POLICY IF EXISTS "auth_insert_message" ON public.messages;
DROP POLICY IF EXISTS "message_participant_read" ON public.messages;
CREATE POLICY "message_participant_read" ON public.messages
  FOR SELECT TO authenticated USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = messages.provider_id AND providers.user_id = auth.uid()
    )
  );
CREATE POLICY "message_participant_create" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    (sender = 'customer' AND customer_id = auth.uid())
    OR (
      sender = 'provider'
      AND EXISTS (
        SELECT 1 FROM public.providers
        WHERE providers.id = messages.provider_id AND providers.user_id = auth.uid()
      )
    )
  );