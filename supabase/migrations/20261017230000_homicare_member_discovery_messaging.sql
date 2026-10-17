CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true)
AS
SELECT
  profiles.public_id,
  CASE WHEN profiles.profile_visibility = 'public' THEN profiles.display_name
       ELSE split_part(profiles.display_name, ' ', 1) END AS display_name,
  profiles.avatar_url,
  profiles.bio,
  CASE WHEN profiles.show_location THEN profiles.city END AS city,
  CASE WHEN profiles.show_location THEN profiles.district END AS district,
  profiles.country,
  CASE WHEN profiles.show_phone THEN profiles.phone_private END AS phone,
  profiles.occupation,
  profiles.household_interests,
  profiles.website,
  profiles.linkedin,
  profiles.facebook
FROM public.profiles AS profiles
WHERE profiles.profile_visibility = 'public'
   OR (profiles.profile_visibility = 'members' AND auth.uid() IS NOT NULL);

GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE VIEW public.member_directory_profiles
WITH (security_barrier = true)
AS
SELECT
  profiles.user_id,
  public_profiles.public_id,
  public_profiles.display_name,
  public_profiles.avatar_url,
  public_profiles.bio,
  public_profiles.city,
  public_profiles.district,
  public_profiles.country,
  public_profiles.phone,
  public_profiles.occupation,
  public_profiles.household_interests,
  public_profiles.website,
  public_profiles.linkedin,
  public_profiles.facebook,
  providers.id AS provider_id,
  providers.professional_title
FROM public.profiles AS profiles
JOIN public.public_profiles AS public_profiles ON public_profiles.public_id = profiles.public_id
LEFT JOIN public.providers AS providers
  ON providers.user_id = profiles.user_id
  AND providers.provider_status = 'active'
WHERE auth.uid() IS NOT NULL;

GRANT SELECT ON public.member_directory_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.create_homicare_profile_for_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone_private, country, profile_visibility)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'Uganda'),
    CASE
      WHEN NEW.raw_user_meta_data->>'profile_visibility' IN ('public', 'members', 'private')
        THEN NEW.raw_user_meta_data->>'profile_visibility'
      ELSE 'private'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.member_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_connections_distinct_participants CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS member_connections_one_pair
  ON public.member_connections (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS member_connections_requester_status
  ON public.member_connections (requester_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS member_connections_addressee_status
  ON public.member_connections (addressee_id, status, updated_at DESC);

ALTER TABLE public.member_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_connections FROM anon, authenticated;
GRANT SELECT ON public.member_connections TO authenticated;

DROP POLICY IF EXISTS "member_connections_participant_read" ON public.member_connections;
CREATE POLICY "member_connections_participant_read" ON public.member_connections
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE OR REPLACE FUNCTION public.request_member_connection(p_profile_public_id uuid)
RETURNS public.member_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requesting_user uuid := auth.uid();
  target_user uuid;
  existing_connection public.member_connections;
BEGIN
  IF requesting_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to connect with HomiCare members.';
  END IF;

  SELECT profiles.user_id INTO target_user
  FROM public.profiles AS profiles
  WHERE profiles.public_id = p_profile_public_id
    AND profiles.profile_visibility IN ('public', 'members');

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'This profile is not available for connections.';
  END IF;
  IF target_user = requesting_user THEN
    RAISE EXCEPTION 'You cannot connect with your own profile.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    LEAST(requesting_user::text, target_user::text) || ':' || GREATEST(requesting_user::text, target_user::text),
    0
  ));

  SELECT connections.* INTO existing_connection
  FROM public.member_connections AS connections
  WHERE (connections.requester_id = requesting_user AND connections.addressee_id = target_user)
     OR (connections.requester_id = target_user AND connections.addressee_id = requesting_user)
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF existing_connection.status = 'accepted'
       OR (existing_connection.status = 'pending' AND existing_connection.requester_id = requesting_user) THEN
      RETURN existing_connection;
    END IF;

    IF existing_connection.status = 'pending' THEN
      UPDATE public.member_connections
      SET status = 'accepted', updated_at = now()
      WHERE id = existing_connection.id
      RETURNING * INTO existing_connection;
      RETURN existing_connection;
    END IF;

    UPDATE public.member_connections
    SET requester_id = requesting_user,
        addressee_id = target_user,
        status = 'pending',
        updated_at = now()
    WHERE id = existing_connection.id
    RETURNING * INTO existing_connection;
    RETURN existing_connection;
  END IF;

  INSERT INTO public.member_connections (requester_id, addressee_id)
  VALUES (requesting_user, target_user)
  RETURNING * INTO existing_connection;
  RETURN existing_connection;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_member_connection(p_connection_id uuid, p_accept boolean)
RETURNS public.member_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  responding_user uuid := auth.uid();
  updated_connection public.member_connections;
BEGIN
  IF responding_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to respond to connection requests.';
  END IF;

  UPDATE public.member_connections
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
      updated_at = now()
  WHERE id = p_connection_id
    AND addressee_id = responding_user
    AND status = 'pending'
  RETURNING * INTO updated_connection;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This connection request is unavailable or has already been handled.';
  END IF;

  RETURN updated_connection;
END;
$$;

REVOKE ALL ON FUNCTION public.request_member_connection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_member_connection(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.respond_member_connection(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_member_connection(uuid, boolean) TO authenticated;

CREATE TABLE IF NOT EXISTS public.member_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_messages_distinct_participants CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS member_messages_sender_created
  ON public.member_messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS member_messages_recipient_created
  ON public.member_messages (recipient_id, created_at DESC);

ALTER TABLE public.member_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.member_messages TO authenticated;

DROP POLICY IF EXISTS "member_messages_connected_read" ON public.member_messages;
CREATE POLICY "member_messages_connected_read" ON public.member_messages
  FOR SELECT TO authenticated
  USING (
    (sender_id = auth.uid() OR recipient_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.member_connections AS connections
      WHERE connections.status = 'accepted'
        AND (
          (connections.requester_id = member_messages.sender_id AND connections.addressee_id = member_messages.recipient_id)
          OR (connections.requester_id = member_messages.recipient_id AND connections.addressee_id = member_messages.sender_id)
        )
    )
  );

DROP POLICY IF EXISTS "member_messages_connected_insert" ON public.member_messages;
CREATE POLICY "member_messages_connected_insert" ON public.member_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.member_connections AS connections
      WHERE connections.status = 'accepted'
        AND (
          (connections.requester_id = sender_id AND connections.addressee_id = recipient_id)
          OR (connections.requester_id = recipient_id AND connections.addressee_id = sender_id)
        )
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'member_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_messages;
  END IF;
END
$$;

DROP POLICY IF EXISTS "homicare_call_participants_receive" ON realtime.messages;
CREATE POLICY "homicare_call_participants_receive"
  ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND realtime.topic() ~ '^homicare-call:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
    AND (
      (
        auth.uid()::text = split_part(realtime.topic(), ':', 3)
        AND (
          EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.provider_id::text = split_part(realtime.topic(), ':', 2)
              AND messages.customer_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.provider_id::text = split_part(realtime.topic(), ':', 2)
              AND bookings.customer_id = auth.uid()
          )
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.providers
        WHERE providers.id::text = split_part(realtime.topic(), ':', 2)
          AND providers.user_id = auth.uid()
          AND (
            EXISTS (
              SELECT 1 FROM public.messages
              WHERE messages.provider_id = providers.id
                AND messages.customer_id::text = split_part(realtime.topic(), ':', 3)
            )
            OR EXISTS (
              SELECT 1 FROM public.bookings
              WHERE bookings.provider_id = providers.id
                AND bookings.customer_id::text = split_part(realtime.topic(), ':', 3)
            )
          )
      )
      OR (
        auth.uid()::text IN (split_part(realtime.topic(), ':', 2), split_part(realtime.topic(), ':', 3))
        AND EXISTS (
          SELECT 1 FROM public.member_connections AS connections
          WHERE connections.status = 'accepted'
            AND (
              (connections.requester_id::text = split_part(realtime.topic(), ':', 2)
                AND connections.addressee_id::text = split_part(realtime.topic(), ':', 3))
              OR (connections.requester_id::text = split_part(realtime.topic(), ':', 3)
                AND connections.addressee_id::text = split_part(realtime.topic(), ':', 2))
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS "homicare_call_participants_send" ON realtime.messages;
CREATE POLICY "homicare_call_participants_send"
  ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND realtime.topic() ~ '^homicare-call:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
    AND (
      (
        auth.uid()::text = split_part(realtime.topic(), ':', 3)
        AND (
          EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.provider_id::text = split_part(realtime.topic(), ':', 2)
              AND messages.customer_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.provider_id::text = split_part(realtime.topic(), ':', 2)
              AND bookings.customer_id = auth.uid()
          )
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.providers
        WHERE providers.id::text = split_part(realtime.topic(), ':', 2)
          AND providers.user_id = auth.uid()
          AND (
            EXISTS (
              SELECT 1 FROM public.messages
              WHERE messages.provider_id = providers.id
                AND messages.customer_id::text = split_part(realtime.topic(), ':', 3)
            )
            OR EXISTS (
              SELECT 1 FROM public.bookings
              WHERE bookings.provider_id = providers.id
                AND bookings.customer_id::text = split_part(realtime.topic(), ':', 3)
            )
          )
      )
      OR (
        auth.uid()::text IN (split_part(realtime.topic(), ':', 2), split_part(realtime.topic(), ':', 3))
        AND EXISTS (
          SELECT 1 FROM public.member_connections AS connections
          WHERE connections.status = 'accepted'
            AND (
              (connections.requester_id::text = split_part(realtime.topic(), ':', 2)
                AND connections.addressee_id::text = split_part(realtime.topic(), ':', 3))
              OR (connections.requester_id::text = split_part(realtime.topic(), ':', 3)
                AND connections.addressee_id::text = split_part(realtime.topic(), ':', 2))
            )
        )
      )
    )
  );
