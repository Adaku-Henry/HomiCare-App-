CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('service_not_provided', 'poor_service', 'incorrect_charge', 'duplicate_payment', 'other')),
  details text NOT NULL,
  evidence_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "refund_requests_owner_read" ON public.refund_requests;
CREATE POLICY "refund_requests_owner_read" ON public.refund_requests
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "refund_requests_owner_create" ON public.refund_requests;
CREATE POLICY "refund_requests_owner_create" ON public.refund_requests
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = refund_requests.booking_id
        AND bookings.customer_id = auth.uid()
        AND bookings.payment_status IN ('paid', 'completed')
    )
  );

CREATE INDEX IF NOT EXISTS idx_refund_requests_owner_created
  ON public.refund_requests(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.service_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('provider_behavior', 'poor_service', 'no_show', 'wrong_price', 'payment_issue', 'safety_concern', 'other')),
  details text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'escalated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT complaint_booking_provider_match CHECK (booking_id IS NULL OR provider_id IS NOT NULL)
);

ALTER TABLE public.service_complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_complaints_owner_read" ON public.service_complaints;
CREATE POLICY "service_complaints_owner_read" ON public.service_complaints
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "service_complaints_owner_create" ON public.service_complaints;
CREATE POLICY "service_complaints_owner_create" ON public.service_complaints
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.providers WHERE providers.id = service_complaints.provider_id)
    AND (
      booking_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = service_complaints.booking_id
          AND bookings.customer_id = auth.uid()
          AND bookings.provider_id = service_complaints.provider_id
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_service_complaints_owner_created
  ON public.service_complaints(owner_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'refund-evidence',
  'refund-evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "refund_evidence_owner_read" ON storage.objects;
CREATE POLICY "refund_evidence_owner_read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'refund-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS "refund_evidence_owner_insert" ON storage.objects;
CREATE POLICY "refund_evidence_owner_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'refund-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
DROP POLICY IF EXISTS "refund_evidence_owner_delete" ON storage.objects;
CREATE POLICY "refund_evidence_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'refund-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );