CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (length(trim(author_name)) BETWEEN 1 AND 80),
  author_role text NOT NULL DEFAULT 'customer' CHECK (author_role IN ('customer', 'provider', 'admin')),
  category text NOT NULL DEFAULT 'Homeowners' CHECK (length(trim(category)) BETWEEN 1 AND 60),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 5000),
  media_path text,
  like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  comment_count integer NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
  ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_category_created_at
  ON public.community_posts(category, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_post_reactions (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (length(trim(author_name)) BETWEEN 1 AND 80),
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_created_at
  ON public.community_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS public.community_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_posts_member_read ON public.community_posts;
CREATE POLICY community_posts_member_read ON public.community_posts
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS community_posts_author_insert ON public.community_posts;
CREATE POLICY community_posts_author_insert ON public.community_posts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS community_posts_author_delete ON public.community_posts;
CREATE POLICY community_posts_author_delete ON public.community_posts
  FOR DELETE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS community_reactions_member_read ON public.community_post_reactions;
CREATE POLICY community_reactions_member_read ON public.community_post_reactions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS community_reactions_owner_insert ON public.community_post_reactions;
CREATE POLICY community_reactions_owner_insert ON public.community_post_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS community_reactions_owner_delete ON public.community_post_reactions;
CREATE POLICY community_reactions_owner_delete ON public.community_post_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS community_comments_member_read ON public.community_comments;
CREATE POLICY community_comments_member_read ON public.community_comments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS community_comments_owner_insert ON public.community_comments;
CREATE POLICY community_comments_owner_insert ON public.community_comments
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS community_comments_owner_delete ON public.community_comments;
CREATE POLICY community_comments_owner_delete ON public.community_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS community_follows_member_read ON public.community_follows;
CREATE POLICY community_follows_member_read ON public.community_follows
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS community_follows_owner_insert ON public.community_follows;
CREATE POLICY community_follows_owner_insert ON public.community_follows
  FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
DROP POLICY IF EXISTS community_follows_owner_delete ON public.community_follows;
CREATE POLICY community_follows_owner_delete ON public.community_follows
  FOR DELETE TO authenticated USING (follower_id = auth.uid());

REVOKE ALL ON public.community_posts FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_posts TO authenticated;
REVOKE ALL ON public.community_post_reactions FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_post_reactions TO authenticated;
REVOKE ALL ON public.community_comments FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_comments TO authenticated;
REVOKE ALL ON public.community_follows FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_follows TO authenticated;

CREATE OR REPLACE FUNCTION public.set_community_post_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users;
BEGIN
  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sign in to publish to the community.';
  END IF;
  NEW.author_name := left(trim(COALESCE(
    NULLIF(v_user.raw_user_meta_data->>'full_name', ''),
    NULLIF(v_user.raw_user_meta_data->>'fullName', ''),
    NULLIF(v_user.raw_user_meta_data->>'name', ''),
    split_part(COALESCE(v_user.email, ''), '@', 1),
    'HomiCare member'
  )), 80);
  NEW.author_role := CASE
    WHEN v_user.raw_app_meta_data->>'role' = 'admin' THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.providers WHERE user_id = v_user.id) THEN 'provider'
    ELSE 'customer'
  END;
  NEW.like_count := 0;
  NEW.comment_count := 0;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_community_comment_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users;
BEGIN
  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sign in to comment in the community.';
  END IF;
  NEW.author_name := left(trim(COALESCE(
    NULLIF(v_user.raw_user_meta_data->>'full_name', ''),
    NULLIF(v_user.raw_user_meta_data->>'fullName', ''),
    NULLIF(v_user.raw_user_meta_data->>'name', ''),
    split_part(COALESCE(v_user.email, ''), '@', 1),
    'HomiCare member'
  )), 80);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_post_author_identity ON public.community_posts;
CREATE TRIGGER community_post_author_identity BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_community_post_author();
DROP TRIGGER IF EXISTS community_comment_author_identity ON public.community_comments;
CREATE TRIGGER community_comment_author_identity BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_community_comment_author();

CREATE OR REPLACE FUNCTION public.update_community_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  UPDATE public.community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS community_like_count_insert ON public.community_post_reactions;
CREATE TRIGGER community_like_count_insert AFTER INSERT ON public.community_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_community_like_count();
DROP TRIGGER IF EXISTS community_like_count_delete ON public.community_post_reactions;
CREATE TRIGGER community_like_count_delete AFTER DELETE ON public.community_post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_community_like_count();

CREATE OR REPLACE FUNCTION public.update_community_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  UPDATE public.community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS community_comment_count_insert ON public.community_comments;
CREATE TRIGGER community_comment_count_insert AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_community_comment_count();
DROP TRIGGER IF EXISTS community_comment_count_delete ON public.community_comments;
CREATE TRIGGER community_comment_count_delete AFTER DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_community_comment_count();

REVOKE ALL ON FUNCTION public.set_community_post_author() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_community_comment_author() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_community_like_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_community_comment_count() FROM PUBLIC, anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-media', 'community-media', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS community_media_member_read ON storage.objects;
CREATE POLICY community_media_member_read ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'community-media');
DROP POLICY IF EXISTS community_media_owner_insert ON storage.objects;
CREATE POLICY community_media_owner_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS community_media_owner_update ON storage.objects;
CREATE POLICY community_media_owner_update ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS community_media_owner_delete ON storage.objects;
CREATE POLICY community_media_owner_delete ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );