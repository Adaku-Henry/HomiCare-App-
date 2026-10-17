CREATE TABLE IF NOT EXISTS public.provider_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

ALTER TABLE public.provider_time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_time_off_public_read" ON public.provider_time_off;
CREATE POLICY "provider_time_off_public_read" ON public.provider_time_off
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "provider_time_off_owner_insert" ON public.provider_time_off;
CREATE POLICY "provider_time_off_owner_insert" ON public.provider_time_off
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_time_off.provider_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "provider_time_off_owner_update" ON public.provider_time_off;
CREATE POLICY "provider_time_off_owner_update" ON public.provider_time_off
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_time_off.provider_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_time_off.provider_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "provider_time_off_owner_delete" ON public.provider_time_off;
CREATE POLICY "provider_time_off_owner_delete" ON public.provider_time_off
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_time_off.provider_id AND p.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.prevent_time_off_booking_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.provider_id = NEW.provider_id
      AND b.scheduled_date BETWEEN NEW.starts_on AND NEW.ends_on
      AND b.status NOT IN ('declined', 'rejected', 'cancelled', 'completed')
  ) THEN
    RAISE EXCEPTION 'Time off overlaps an existing scheduled service.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provider_time_off_no_booking_conflicts ON public.provider_time_off;
CREATE TRIGGER provider_time_off_no_booking_conflicts
  BEFORE INSERT OR UPDATE OF provider_id, starts_on, ends_on ON public.provider_time_off
  FOR EACH ROW EXECUTE FUNCTION public.prevent_time_off_booking_conflicts();

DROP POLICY IF EXISTS "customer_create_booking" ON public.bookings;
CREATE POLICY "customer_create_booking" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'requested'
    AND payment_status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.provider_time_off off
      WHERE off.provider_id = bookings.provider_id
        AND bookings.scheduled_date BETWEEN off.starts_on AND off.ends_on
    )
    AND (
      scheduled_date IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.provider_availability a
        WHERE a.provider_id = bookings.provider_id
      )
      OR (
        scheduled_time IS NOT NULL
        AND scheduled_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
        AND EXISTS (
          SELECT 1 FROM public.provider_availability a
          WHERE a.provider_id = bookings.provider_id
            AND a.day_of_week = EXTRACT(DOW FROM bookings.scheduled_date)::smallint
            AND a.is_available
            AND (NOT a.emergency_only OR bookings.urgency = 'emergency')
            AND CASE
              WHEN bookings.scheduled_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
              THEN bookings.scheduled_time::time >= a.start_time AND bookings.scheduled_time::time < a.end_time
              ELSE false
            END
        )
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_provider_time_off_provider_dates
  ON public.provider_time_off(provider_id, starts_on, ends_on);
