DROP POLICY IF EXISTS "homicare_call_participants_receive" ON realtime.messages;
CREATE POLICY "homicare_call_participants_receive"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension = 'broadcast'
    AND realtime.topic() ~ '^homicare-call:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
    AND (
      (
        auth.uid()::text = split_part(realtime.topic(), ':', 3)
        AND (
          EXISTS (
            SELECT 1
            FROM public.messages
            WHERE messages.provider_id::text = split_part(realtime.topic(), ':', 2)
              AND messages.customer_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.bookings
            WHERE bookings.provider_id::text = split_part(realtime.topic(), ':', 2)
              AND bookings.customer_id = auth.uid()
          )
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.providers
        WHERE providers.id::text = split_part(realtime.topic(), ':', 2)
          AND providers.user_id = auth.uid()
          AND (
            EXISTS (
              SELECT 1
              FROM public.messages
              WHERE messages.provider_id = providers.id
                AND messages.customer_id::text = split_part(realtime.topic(), ':', 3)
            )
            OR EXISTS (
              SELECT 1
              FROM public.bookings
              WHERE bookings.provider_id = providers.id
                AND bookings.customer_id::text = split_part(realtime.topic(), ':', 3)
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "homicare_call_participants_send" ON realtime.messages;
CREATE POLICY "homicare_call_participants_send"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND realtime.topic() ~ '^homicare-call:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
    AND (
      (
        auth.uid()::text = split_part(realtime.topic(), ':', 3)
        AND (
          EXISTS (
            SELECT 1
            FROM public.messages
            WHERE messages.provider_id::text = split_part(realtime.topic(), ':', 2)
              AND messages.customer_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.bookings
            WHERE bookings.provider_id::text = split_part(realtime.topic(), ':', 2)
              AND bookings.customer_id = auth.uid()
          )
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.providers
        WHERE providers.id::text = split_part(realtime.topic(), ':', 2)
          AND providers.user_id = auth.uid()
          AND (
            EXISTS (
              SELECT 1
              FROM public.messages
              WHERE messages.provider_id = providers.id
                AND messages.customer_id::text = split_part(realtime.topic(), ':', 3)
            )
            OR EXISTS (
              SELECT 1
              FROM public.bookings
              WHERE bookings.provider_id = providers.id
                AND bookings.customer_id::text = split_part(realtime.topic(), ':', 3)
            )
          )
      )
    )
  );
