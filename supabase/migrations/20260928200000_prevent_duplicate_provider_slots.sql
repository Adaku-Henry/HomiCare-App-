CREATE OR REPLACE FUNCTION public.prevent_duplicate_provider_time_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.scheduled_date IS NULL
    OR NEW.scheduled_time IS NULL
    OR NEW.status IN ('completed', 'declined', 'rejected', 'cancelled') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(NEW.provider_id::text),
    (NEW.scheduled_date - DATE '2000-01-01')
  );

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.provider_id = NEW.provider_id
      AND b.scheduled_date = NEW.scheduled_date
      AND b.scheduled_time = NEW.scheduled_time
      AND b.id IS DISTINCT FROM NEW.id
      AND b.status NOT IN ('completed', 'declined', 'rejected', 'cancelled')
  ) THEN
    RAISE EXCEPTION 'This provider already has an active request at this date and time.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_prevent_duplicate_provider_time_slot ON public.bookings;
CREATE TRIGGER bookings_prevent_duplicate_provider_time_slot
  BEFORE INSERT OR UPDATE OF provider_id, scheduled_date, scheduled_time, status
  ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_provider_time_slot();
