CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_kind text NOT NULL DEFAULT 'booking' CHECK (payment_kind IN ('booking', 'wallet_topup')),
  tx_ref text NOT NULL UNIQUE,
  gateway_transaction_id text UNIQUE,
  payment_method text NOT NULL CHECK (payment_method IN ('mtn_mobile_money', 'airtel_money', 'visa')),
  amount bigint NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'UGX' CHECK (currency = 'UGX'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (payment_kind = 'booking' AND booking_id IS NOT NULL)
    OR (payment_kind = 'wallet_topup' AND booking_id IS NULL)
  )
);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.payment_attempts TO authenticated;

DROP POLICY IF EXISTS "payment_attempts_owner_read" ON public.payment_attempts;
CREATE POLICY "payment_attempts_owner_read" ON public.payment_attempts
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

CREATE INDEX IF NOT EXISTS payment_attempts_booking_recent_idx
  ON public.payment_attempts (booking_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_client_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.jwt()->>'role' = 'authenticated'
    AND auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin'
    AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    RAISE EXCEPTION 'Payment status can only be changed after trusted gateway verification';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_payment_status_change ON public.bookings;
CREATE TRIGGER prevent_client_payment_status_change
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_payment_status_change();

CREATE OR REPLACE FUNCTION public.confirm_flutterwave_payment(
  p_attempt_id uuid,
  p_gateway_transaction_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_attempt public.payment_attempts%ROWTYPE;
  booking_code_value text;
BEGIN
  IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Trusted payment service required';
  END IF;

  SELECT * INTO payment_attempt
  FROM public.payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment attempt not found';
  END IF;

  IF payment_attempt.status = 'successful' THEN
    IF payment_attempt.gateway_transaction_id IS DISTINCT FROM p_gateway_transaction_id THEN
      RAISE EXCEPTION 'Gateway transaction does not match the confirmed payment';
    END IF;
    IF payment_attempt.payment_kind = 'wallet_topup' THEN
      RETURN jsonb_build_object('status', 'successful', 'payment_kind', 'wallet_topup', 'idempotent', true);
    END IF;
    SELECT booking_code INTO booking_code_value FROM public.bookings WHERE id = payment_attempt.booking_id;
    RETURN jsonb_build_object('status', 'successful', 'payment_kind', 'booking', 'booking_code', booking_code_value, 'idempotent', true);
  END IF;
  IF payment_attempt.status <> 'pending' THEN
    RAISE EXCEPTION 'Payment attempt is not pending';
  END IF;

  IF payment_attempt.payment_kind = 'wallet_topup' THEN
    INSERT INTO public.wallet_transactions (
      owner_id, transaction_type, amount, currency, description,
      payment_method, transaction_reference, status
    ) VALUES (
      payment_attempt.customer_id, 'topup', payment_attempt.amount,
      payment_attempt.currency, 'HomiCare wallet top-up',
      payment_attempt.payment_method, payment_attempt.tx_ref, 'completed'
    );

    UPDATE public.payment_attempts
    SET status = 'successful',
        gateway_transaction_id = p_gateway_transaction_id,
        updated_at = now()
    WHERE id = p_attempt_id;
    RETURN jsonb_build_object('status', 'successful', 'payment_kind', 'wallet_topup', 'idempotent', false);
  END IF;

  UPDATE public.bookings
  SET payment_status = 'paid', payment_method = payment_attempt.payment_method
  WHERE id = payment_attempt.booking_id
    AND customer_id = payment_attempt.customer_id
    AND payment_status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking is unavailable or already paid';
  END IF;

  UPDATE public.payment_attempts
  SET status = 'successful',
      gateway_transaction_id = p_gateway_transaction_id,
      updated_at = now()
  WHERE id = p_attempt_id;

  INSERT INTO public.wallet_transactions (
    owner_id, provider_id, transaction_type, amount, currency,
    description, booking_id, payment_method, transaction_reference, status
  )
  SELECT
    payment_attempt.customer_id,
    booking.provider_id,
    'payment',
    -payment_attempt.amount,
    payment_attempt.currency,
    concat('Booking payment ', booking.booking_code),
    booking.id,
    payment_attempt.payment_method,
    payment_attempt.tx_ref,
    'completed'
  FROM public.bookings AS booking
  WHERE booking.id = payment_attempt.booking_id;

  SELECT booking_code INTO booking_code_value FROM public.bookings WHERE id = payment_attempt.booking_id;
  RETURN jsonb_build_object('status', 'successful', 'payment_kind', 'booking', 'booking_code', booking_code_value, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_client_payment_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_flutterwave_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_flutterwave_payment(uuid, text) TO service_role;
