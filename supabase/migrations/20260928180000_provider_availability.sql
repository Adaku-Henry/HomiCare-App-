CREATE TABLE IF NOT EXISTS public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_available boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  emergency_only boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, day_of_week),
  CHECK (NOT emergency_only OR is_available),
  CHECK (NOT is_available OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time))
);

ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_public_read" ON public.provider_availability;
CREATE POLICY "availability_public_read" ON public.provider_availability
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "availability_owner_insert" ON public.provider_availability;
CREATE POLICY "availability_owner_insert" ON public.provider_availability
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_availability.provider_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "availability_owner_update" ON public.provider_availability;
CREATE POLICY "availability_owner_update" ON public.provider_availability
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_availability.provider_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_availability.provider_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "availability_owner_delete" ON public.provider_availability;
CREATE POLICY "availability_owner_delete" ON public.provider_availability
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = provider_availability.provider_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "customer_create_booking" ON public.bookings;
CREATE POLICY "customer_create_booking" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'requested'
    AND payment_status = 'pending'
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

CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_day
  ON public.provider_availability(provider_id, day_of_week);
