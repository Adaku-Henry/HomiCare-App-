-- Booking rows contain customer contact details and exact service locations.
-- Restrict them to the customer and the assigned provider.
DROP POLICY IF EXISTS "public_read_bookings" ON bookings;
DROP POLICY IF EXISTS "auth_insert_booking" ON bookings;
DROP POLICY IF EXISTS "auth_update_booking" ON bookings;

CREATE POLICY "booking_participants_read" ON bookings
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = bookings.provider_id
        AND providers.user_id = auth.uid()
    )
  );

CREATE POLICY "customer_create_booking" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'requested'
    AND payment_status = 'pending'
  );

CREATE POLICY "booking_participants_update" ON bookings
  FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = bookings.provider_id
        AND providers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = bookings.provider_id
        AND providers.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);