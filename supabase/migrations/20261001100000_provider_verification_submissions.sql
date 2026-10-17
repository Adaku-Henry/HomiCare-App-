INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-evidence',
  'verification-evidence',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.provider_verification_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('identity', 'phone', 'skills', 'certification', 'business', 'portfolio')),
  storage_path text NOT NULL,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_verification_one_pending_per_type
  ON public.provider_verification_submissions (provider_id, verification_type)
  WHERE status = 'pending';

ALTER TABLE public.provider_verification_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.provider_verification_submissions TO authenticated;

DROP POLICY IF EXISTS "provider_verification_owner_read" ON public.provider_verification_submissions;
CREATE POLICY "provider_verification_owner_read" ON public.provider_verification_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = provider_verification_submissions.provider_id
        AND providers.user_id = auth.uid()
    )
    OR auth.jwt()->'app_metadata'->>'role' = 'admin'
  );

DROP POLICY IF EXISTS "provider_verification_owner_insert" ON public.provider_verification_submissions;
CREATE POLICY "provider_verification_owner_insert" ON public.provider_verification_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = provider_verification_submissions.provider_id
        AND providers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "verification_evidence_owner_read" ON storage.objects;
CREATE POLICY "verification_evidence_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-evidence'
    AND (
      EXISTS (
        SELECT 1 FROM public.providers
        WHERE providers.id::text = (storage.foldername(name))[1]
          AND providers.user_id = auth.uid()
      )
      OR auth.jwt()->'app_metadata'->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "verification_evidence_owner_insert" ON storage.objects;
CREATE POLICY "verification_evidence_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-evidence'
    AND EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id::text = (storage.foldername(name))[1]
        AND providers.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.admin_review_provider_verification(
  p_submission_id uuid,
  p_status text,
  p_review_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_provider_id uuid;
  target_type text;
BEGIN
  IF auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Verification status must be approved or rejected';
  END IF;

  UPDATE public.provider_verification_submissions
  SET status = p_status,
      review_notes = NULLIF(trim(p_review_notes), ''),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_submission_id
    AND status = 'pending'
  RETURNING provider_id, verification_type INTO target_provider_id, target_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending verification submission not found';
  END IF;

  CASE target_type
    WHEN 'identity' THEN UPDATE public.providers SET identity_verified = (p_status = 'approved') WHERE id = target_provider_id;
    WHEN 'phone' THEN UPDATE public.providers SET phone_verified = (p_status = 'approved') WHERE id = target_provider_id;
    WHEN 'skills' THEN UPDATE public.providers SET skills_verified = (p_status = 'approved') WHERE id = target_provider_id;
    WHEN 'certification' THEN UPDATE public.providers SET certification_verified = (p_status = 'approved') WHERE id = target_provider_id;
    WHEN 'business' THEN UPDATE public.providers SET business_verified = (p_status = 'approved') WHERE id = target_provider_id;
    WHEN 'portfolio' THEN UPDATE public.providers SET portfolio_verified = (p_status = 'approved') WHERE id = target_provider_id;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_provider_verification(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_provider_verification(uuid, text, text) TO authenticated;
