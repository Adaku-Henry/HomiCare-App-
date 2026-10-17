CREATE TABLE IF NOT EXISTS public.provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, provider_id)
);

ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.provider_connections TO authenticated;

DROP POLICY IF EXISTS "provider_connections_participant_read" ON public.provider_connections;
CREATE POLICY "provider_connections_participant_read" ON public.provider_connections
  FOR SELECT TO authenticated USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = provider_connections.provider_id
        AND providers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "provider_connections_customer_insert" ON public.provider_connections;
CREATE POLICY "provider_connections_customer_insert" ON public.provider_connections
  FOR INSERT TO authenticated WITH CHECK (
    customer_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = provider_connections.provider_id
        AND providers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "provider_connections_participant_delete" ON public.provider_connections;
CREATE POLICY "provider_connections_participant_delete" ON public.provider_connections
  FOR DELETE TO authenticated USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.providers
      WHERE providers.id = provider_connections.provider_id
        AND providers.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_provider_connections_customer
  ON public.provider_connections(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_connections_provider
  ON public.provider_connections(provider_id, created_at DESC);
