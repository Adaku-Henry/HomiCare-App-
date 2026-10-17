ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'booking';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_request_type_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_request_type_check
      CHECK (request_type IN ('booking', 'quote'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.booking_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  labor_amount integer NOT NULL CHECK (labor_amount >= 0),
  materials_amount integer NOT NULL DEFAULT 0 CHECK (materials_amount >= 0),
  transport_amount integer NOT NULL DEFAULT 0 CHECK (transport_amount >= 0),
  total_amount integer GENERATED ALWAYS AS (labor_amount + materials_amount + transport_amount) STORED,
  estimated_duration text,
  warranty text,
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'rejected', 'revision_requested')),
  revision_count integer NOT NULL DEFAULT 0 CHECK (revision_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, provider_id)
);

ALTER TABLE public.booking_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_participants_read" ON public.booking_quotes;
CREATE POLICY "quote_participants_read" ON public.booking_quotes
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = booking_quotes.provider_id AND p.user_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.booking_quotes FROM anon, authenticated;
GRANT SELECT ON public.booking_quotes TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_booking_quote(
  p_booking_id uuid,
  p_labor_amount integer,
  p_materials_amount integer DEFAULT 0,
  p_transport_amount integer DEFAULT 0,
  p_estimated_duration text DEFAULT NULL,
  p_warranty text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS public.booking_quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_booking public.bookings;
  v_provider public.providers;
  v_quote public.booking_quotes;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to submit a quote.';
  END IF;
  IF p_labor_amount IS NULL OR p_labor_amount < 0
    OR COALESCE(p_materials_amount, 0) < 0
    OR COALESCE(p_transport_amount, 0) < 0
    OR p_labor_amount + COALESCE(p_materials_amount, 0) + COALESCE(p_transport_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Quote amounts must be non-negative and have a total above zero.';
  END IF;
  IF length(trim(COALESCE(p_message, ''))) = 0 OR length(p_message) > 2000 THEN
    RAISE EXCEPTION 'Add a quote message between 1 and 2000 characters.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR v_booking.request_type <> 'quote' OR v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'This quote request is no longer open.';
  END IF;

  SELECT * INTO v_provider FROM public.providers
    WHERE id = v_booking.provider_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the assigned provider can submit this quote.';
  END IF;

  SELECT * INTO v_quote FROM public.booking_quotes
    WHERE booking_id = v_booking.id AND provider_id = v_provider.id FOR UPDATE;
  IF FOUND THEN
    IF v_quote.status <> 'revision_requested' THEN
      RAISE EXCEPTION 'A quote has already been submitted for this request.';
    END IF;
    UPDATE public.booking_quotes SET
      labor_amount = p_labor_amount,
      materials_amount = COALESCE(p_materials_amount, 0),
      transport_amount = COALESCE(p_transport_amount, 0),
      estimated_duration = NULLIF(trim(p_estimated_duration), ''),
      warranty = NULLIF(trim(p_warranty), ''),
      message = trim(p_message),
      status = 'sent',
      revision_count = revision_count + 1,
      updated_at = now()
    WHERE id = v_quote.id RETURNING * INTO v_quote;
  ELSE
    INSERT INTO public.booking_quotes (
      booking_id, provider_id, customer_id, labor_amount, materials_amount,
      transport_amount, estimated_duration, warranty, message
    ) VALUES (
      v_booking.id, v_provider.id, v_booking.customer_id, p_labor_amount,
      COALESCE(p_materials_amount, 0), COALESCE(p_transport_amount, 0),
      NULLIF(trim(p_estimated_duration), ''), NULLIF(trim(p_warranty), ''), trim(p_message)
    ) RETURNING * INTO v_quote;
  END IF;

  UPDATE public.bookings SET quoted_price = v_quote.total_amount WHERE id = v_booking.id;
  RETURN v_quote;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_booking_quote(
  p_quote_id uuid,
  p_decision text
)
RETURNS public.booking_quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_quote public.booking_quotes;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to respond to a quote.';
  END IF;
  IF p_decision NOT IN ('accepted', 'rejected', 'revision_requested') THEN
    RAISE EXCEPTION 'Choose accept, decline, or request a revision.';
  END IF;

  SELECT * INTO v_quote FROM public.booking_quotes
    WHERE id = p_quote_id AND customer_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_quote.status <> 'sent' THEN
    RAISE EXCEPTION 'This quote is no longer awaiting a response.';
  END IF;

  UPDATE public.booking_quotes SET status = p_decision, updated_at = now()
    WHERE id = v_quote.id RETURNING * INTO v_quote;

  IF p_decision = 'accepted' THEN
    UPDATE public.bookings SET status = 'accepted', quoted_price = v_quote.total_amount,
      final_price = v_quote.total_amount WHERE id = v_quote.booking_id;
    UPDATE public.booking_quotes SET status = 'rejected', updated_at = now()
      WHERE booking_id = v_quote.booking_id AND id <> v_quote.id AND status = 'sent';
  ELSIF p_decision = 'rejected' THEN
    UPDATE public.bookings SET status = 'declined' WHERE id = v_quote.booking_id;
  END IF;

  RETURN v_quote;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_booking_quote(uuid, integer, integer, integer, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_booking_quote(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_booking_quote(uuid, integer, integer, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_booking_quote(uuid, text) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_booking_quotes_customer ON public.booking_quotes(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_quotes_provider ON public.booking_quotes(provider_id, status);