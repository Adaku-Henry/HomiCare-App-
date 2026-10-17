CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status text NOT NULL,
  event_type text NOT NULL DEFAULT 'status_change'
    CHECK (event_type IN ('status_change', 'migration_snapshot')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_recorded
  ON public.booking_status_history(booking_id, recorded_at);

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_status_history_participant_read"
  ON public.booking_status_history;
CREATE POLICY "booking_status_history_participant_read"
  ON public.booking_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings
      WHERE bookings.id = booking_status_history.booking_id
        AND (
          bookings.customer_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.providers
            WHERE providers.id = bookings.provider_id
              AND providers.user_id = (SELECT auth.uid())
          )
        )
    )
  );

GRANT SELECT ON public.booking_status_history TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.booking_status_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_booking_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.booking_status_history (booking_id, status, event_type)
  VALUES (NEW.id, NEW.status, 'status_change');

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_booking_status_history() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS record_booking_status_history_after_change ON public.bookings;
CREATE TRIGGER record_booking_status_history_after_change
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.record_booking_status_history();

-- Existing rows only reveal their current status; do not imply earlier transitions.
INSERT INTO public.booking_status_history (booking_id, status, event_type, recorded_at)
SELECT bookings.id, bookings.status, 'migration_snapshot', now()
FROM public.bookings
WHERE NOT EXISTS (
  SELECT 1
  FROM public.booking_status_history
  WHERE booking_status_history.booking_id = bookings.id
);
