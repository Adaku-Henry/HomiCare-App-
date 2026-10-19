CREATE OR REPLACE VIEW public.public_provider_profiles AS
SELECT
  providers.id,
  COALESCE(NULLIF(providers.business_name, ''), NULLIF(profiles.display_name, ''), providers.full_name) AS full_name,
  providers.professional_title,
  COALESCE(profiles.avatar_url, providers.avatar_url) AS avatar_url,
  COALESCE(profiles.cover_url, providers.cover_url) AS cover_url,
  COALESCE(NULLIF(providers.bio, ''), NULLIF(profiles.bio, '')) AS bio,
  providers.primary_service_category_id,
  CASE WHEN profiles.user_id IS NULL THEN providers.location
       ELSE COALESCE(NULLIF(profiles.city, ''), providers.location)
  END AS location,
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
  providers.created_at
FROM public.providers AS providers
LEFT JOIN public.profiles AS profiles ON profiles.user_id = providers.user_id
WHERE providers.provider_status IN ('active', 'pending')
   OR (providers.user_id IS NULL AND profiles.user_id IS NULL);

GRANT SELECT ON public.public_provider_profiles TO anon, authenticated;
