ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_attachments_array;

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_attachments_array
  CHECK (jsonb_typeof(attachments) = 'array');

-- Ensure public access for community media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-media',
  'community-media',
  true,
  26214400,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS community_media_member_read ON storage.objects;
DROP POLICY IF EXISTS community_media_public_read ON storage.objects;
CREATE POLICY community_media_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS community_media_owner_insert ON storage.objects;
CREATE POLICY community_media_owner_insert ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'community-media');

DROP POLICY IF EXISTS community_media_owner_delete ON storage.objects;
CREATE POLICY community_media_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community-media'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR auth.role() = 'authenticated')
  );

-- Ensure RLS on community_posts allows reading and creating posts
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_public_read" ON public.community_posts;
CREATE POLICY "community_posts_public_read" ON public.community_posts
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "community_posts_public_insert" ON public.community_posts;
CREATE POLICY "community_posts_public_insert" ON public.community_posts
  FOR INSERT TO public
  WITH CHECK (true);
