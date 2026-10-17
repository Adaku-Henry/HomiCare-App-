INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-media',
  'conversation-media',
  false,
  15728640,
  ARRAY['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "conversation_media_participants_read" ON storage.objects;
CREATE POLICY "conversation_media_participants_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'conversation-media'
    AND (
      (
        auth.uid()::text = (storage.foldername(name))[2]
        AND (
          EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.provider_id::text = (storage.foldername(name))[1]
              AND messages.customer_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.provider_id::text = (storage.foldername(name))[1]
              AND bookings.customer_id = auth.uid()
          )
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.providers
        WHERE providers.id::text = (storage.foldername(name))[1]
          AND providers.user_id = auth.uid()
          AND (
            EXISTS (
              SELECT 1 FROM public.messages
              WHERE messages.provider_id = providers.id
                AND messages.customer_id::text = (storage.foldername(name))[2]
            )
            OR EXISTS (
              SELECT 1 FROM public.bookings
              WHERE bookings.provider_id = providers.id
                AND bookings.customer_id::text = (storage.foldername(name))[2]
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "conversation_media_participants_upload" ON storage.objects;
CREATE POLICY "conversation_media_participants_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'conversation-media'
    AND (
      (
        auth.uid()::text = (storage.foldername(name))[2]
        AND (
          EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.provider_id::text = (storage.foldername(name))[1]
              AND messages.customer_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.provider_id::text = (storage.foldername(name))[1]
              AND bookings.customer_id = auth.uid()
          )
        )
      )
      OR EXISTS (
        SELECT 1
        FROM public.providers
        WHERE providers.id::text = (storage.foldername(name))[1]
          AND providers.user_id = auth.uid()
          AND (
            EXISTS (
              SELECT 1 FROM public.messages
              WHERE messages.provider_id = providers.id
                AND messages.customer_id::text = (storage.foldername(name))[2]
            )
            OR EXISTS (
              SELECT 1 FROM public.bookings
              WHERE bookings.provider_id = providers.id
                AND bookings.customer_id::text = (storage.foldername(name))[2]
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "conversation_media_participants_delete" ON storage.objects;
CREATE POLICY "conversation_media_participants_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'conversation-media'
    AND (
      auth.uid()::text = (storage.foldername(name))[2]
      OR EXISTS (
        SELECT 1
        FROM public.providers
        WHERE providers.id::text = (storage.foldername(name))[1]
          AND providers.user_id = auth.uid()
      )
    )
  );
