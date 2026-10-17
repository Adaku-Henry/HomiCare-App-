CREATE TABLE IF NOT EXISTS public.provider_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('identity', 'qualification', 'business')),
  storage_path text NOT NULL UNIQUE,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_verification_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.provider_verification_documents TO authenticated;

DROP POLICY IF EXISTS "provider_verification_owner_read" ON public.provider_verification_documents;
CREATE POLICY "provider_verification_owner_read" ON public.provider_verification_documents
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = provider_verification_documents.provider_id
        AND providers.user_id = auth.uid()
    )
    OR auth.jwt()->'app_metadata'->>'role' = 'admin'
  );

DROP POLICY IF EXISTS "provider_verification_owner_insert" ON public.provider_verification_documents;
CREATE POLICY "provider_verification_owner_insert" ON public.provider_verification_documents
  FOR INSERT TO authenticated WITH CHECK (
    review_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = provider_verification_documents.provider_id
        AND providers.user_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-verification',
  'provider-verification',
  false,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "provider_verification_file_owner_read" ON storage.objects;
CREATE POLICY "provider_verification_file_owner_read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'provider-verification'
    AND (
      EXISTS (
        SELECT 1 FROM public.providers
        WHERE providers.id::text = (storage.foldername(name))[1]
          AND providers.user_id = auth.uid()
      )
      OR auth.jwt()->'app_metadata'->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "provider_verification_file_owner_insert" ON storage.objects;
CREATE POLICY "provider_verification_file_owner_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'provider-verification'
    AND EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id::text = (storage.foldername(name))[1]
        AND providers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "public_read_portfolio" ON public.portfolio_projects;
REVOKE SELECT ON public.portfolio_projects FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_projects TO authenticated;

DROP POLICY IF EXISTS "portfolio_owner_or_admin_read" ON public.portfolio_projects;
CREATE POLICY "portfolio_owner_or_admin_read" ON public.portfolio_projects
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = portfolio_projects.provider_id
        AND providers.user_id = auth.uid()
    )
    OR auth.jwt()->'app_metadata'->>'role' = 'admin'
  );
