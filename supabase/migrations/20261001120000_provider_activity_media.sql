INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.provider_activity_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_path text NOT NULL,
  caption text NOT NULL DEFAULT '' CHECK (char_length(caption) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_activity_media_recent_idx
  ON public.provider_activity_media (provider_id, created_at DESC);

ALTER TABLE public.provider_activity_media ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.provider_activity_media TO authenticated;

DROP POLICY IF EXISTS "provider_activity_media_owner_read" ON public.provider_activity_media;
CREATE POLICY "provider_activity_media_owner_read" ON public.provider_activity_media
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers
    WHERE providers.id = provider_activity_media.provider_id
      AND providers.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "provider_activity_media_owner_insert" ON public.provider_activity_media;
CREATE POLICY "provider_activity_media_owner_insert" ON public.provider_activity_media
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers
    WHERE providers.id = provider_activity_media.provider_id
      AND providers.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "provider_activity_media_owner_delete" ON public.provider_activity_media;
CREATE POLICY "provider_activity_media_owner_delete" ON public.provider_activity_media
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers
    WHERE providers.id = provider_activity_media.provider_id
      AND providers.user_id = auth.uid()
  ));

CREATE OR REPLACE VIEW public.public_provider_activity_media
WITH (security_barrier = true)
AS
SELECT
  media.id,
  media.provider_id,
  media.media_type,
  media.storage_path,
  media.caption,
  media.created_at
FROM public.provider_activity_media AS media
JOIN public.providers AS providers ON providers.id = media.provider_id
LEFT JOIN public.profiles AS profiles ON profiles.user_id = providers.user_id
WHERE providers.provider_status = 'active'
  AND (
    profiles.profile_visibility = 'public'
    OR (profiles.profile_visibility = 'members' AND auth.uid() IS NOT NULL)
    OR (providers.user_id IS NULL AND profiles.user_id IS NULL)
  );

GRANT SELECT ON public.public_provider_activity_media TO anon, authenticated;
