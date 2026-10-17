CREATE OR REPLACE FUNCTION public.respond_to_service_request(
  p_booking_id uuid,
  p_decision text
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_booking public.bookings;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to respond to a service request.';
  END IF;
  IF p_decision NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Choose accept or decline.';
  END IF;

  SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;
  IF NOT FOUND OR v_booking.request_type = 'quote' OR v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'This service request is no longer open.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = v_booking.provider_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the assigned provider can respond to this request.';
  END IF;

  UPDATE public.bookings
    SET status = p_decision
    WHERE id = v_booking.id
    RETURNING * INTO v_booking;
  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_service_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_service_request(uuid, text) TO authenticated;