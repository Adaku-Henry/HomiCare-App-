ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "public_read_notifications" ON public.notifications;
DROP POLICY IF EXISTS "auth_insert_notification" ON public.notifications;
DROP POLICY IF EXISTS "auth_update_notification" ON public.notifications;

CREATE POLICY "notification_owner_read" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY "notification_owner_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (recipient_id = auth.uid() OR auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY "notification_owner_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR auth.jwt()->'app_metadata'->>'role' = 'admin')
  WITH CHECK (recipient_id = auth.uid() OR auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY "notification_owner_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (recipient_id = auth.uid() OR auth.jwt()->'app_metadata'->>'role' = 'admin');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_booking_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_user_id uuid;
  notification_title text;
  notification_body text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT providers.user_id INTO provider_user_id
  FROM public.providers
  WHERE providers.id = NEW.provider_id;

  IF TG_OP = 'INSERT' THEN
    notification_title := 'New booking request';
    notification_body := 'A customer requested ' || NEW.service_name || '.';
  ELSE
    notification_title := 'Booking status updated';
    notification_body := NEW.service_name || ' is now ' || replace(NEW.status, '_', ' ') || '.';
  END IF;

  IF provider_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_id, recipient_type, category, priority, title, body, action_url
    ) VALUES (
      provider_user_id, 'provider', 'bookings', 'normal', notification_title,
      notification_body, '/bookings'
    );
  END IF;

  IF NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_id, recipient_type, category, priority, title, body, action_url
    ) VALUES (
      NEW.customer_id, 'customer', 'bookings', 'normal', notification_title,
      notification_body, '/bookings'
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_booking_participants() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notify_booking_participants ON public.bookings;
CREATE TRIGGER notify_booking_participants
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_participants();

CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_user_id uuid;
  recipient_type text;
BEGIN
  IF NEW.sender = 'customer' THEN
    SELECT providers.user_id INTO recipient_user_id
    FROM public.providers
    WHERE providers.id = NEW.provider_id;
    recipient_type := 'provider';
  ELSIF NEW.sender = 'provider' THEN
    recipient_user_id := NEW.customer_id;
    recipient_type := 'customer';
  ELSE
    RETURN NEW;
  END IF;

  IF recipient_user_id IS NOT NULL AND recipient_user_id IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications (
      recipient_id, recipient_type, category, priority, title, body, action_url
    ) VALUES (
      recipient_user_id, recipient_type, 'messages', 'normal',
      'New HomiCare message', 'You have a new message in your conversation.',
      '/messages'
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_message_recipient() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notify_message_recipient ON public.messages;
CREATE TRIGGER notify_message_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_recipient();

CREATE TABLE IF NOT EXISTS public.safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('account', 'business', 'message', 'booking', 'payment', 'listing', 'review')),
  target_reference text NOT NULL DEFAULT '' CHECK (char_length(target_reference) <= 200),
  reason text NOT NULL CHECK (reason IN ('safety', 'fraud', 'harassment', 'impersonation', 'payment', 'other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 3000),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.safety_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.safety_reports TO authenticated;
CREATE POLICY "safety_report_owner_read" ON public.safety_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY "safety_report_owner_create" ON public.safety_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'received');

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_user_id),
  CHECK (blocker_id <> blocked_user_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_blocks FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
CREATE POLICY "user_block_owner_read" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());
CREATE POLICY "user_block_owner_create" ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND blocked_user_id <> auth.uid());
CREATE POLICY "user_block_owner_delete" ON public.user_blocks
  FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_message_blocked(
  p_customer_id text,
  p_provider_id text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  provider_user_id uuid;
BEGIN
  SELECT providers.user_id INTO provider_user_id
  FROM public.providers
  WHERE providers.id::text = p_provider_id;

  IF auth.uid() IS NULL
    OR (auth.uid()::text IS DISTINCT FROM p_customer_id
      AND auth.uid() IS DISTINCT FROM provider_user_id) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_blocks AS block
    WHERE (block.blocker_id::text = p_customer_id AND block.blocked_user_id = provider_user_id)
      OR (block.blocker_id = provider_user_id AND block.blocked_user_id::text = p_customer_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.is_message_blocked(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_message_blocked(text, text) TO authenticated;

DROP POLICY IF EXISTS "message_participant_read" ON public.messages;
CREATE POLICY "message_participant_read" ON public.messages
  FOR SELECT TO authenticated
  USING (
    (
      customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.providers
        WHERE providers.id = messages.provider_id AND providers.user_id = auth.uid()
      )
    )
    AND NOT public.is_message_blocked(messages.customer_id::text, messages.provider_id::text)
  );

DROP POLICY IF EXISTS "message_participant_create" ON public.messages;
CREATE POLICY "message_participant_create" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (sender = 'customer' AND customer_id = auth.uid())
      OR (
        sender = 'provider'
        AND EXISTS (
          SELECT 1 FROM public.providers
          WHERE providers.id = messages.provider_id AND providers.user_id = auth.uid()
        )
      )
    )
    AND NOT public.is_message_blocked(messages.customer_id::text, messages.provider_id::text)
  );

CREATE POLICY "homicare_call_blocks_restrict_read"
  ON realtime.messages AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND realtime.topic() ~ '^homicare-call:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
    AND NOT public.is_message_blocked(
      split_part(realtime.topic(), ':', 3),
      split_part(realtime.topic(), ':', 2)
    )
  );
CREATE POLICY "homicare_call_blocks_restrict_insert"
  ON realtime.messages AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND realtime.topic() ~ '^homicare-call:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'
    AND NOT public.is_message_blocked(
      split_part(realtime.topic(), ':', 3),
      split_part(realtime.topic(), ':', 2)
    )
  );

CREATE TABLE IF NOT EXISTS public.learning_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
ALTER TABLE public.learning_enrollments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_enrollments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.learning_enrollments TO authenticated;
CREATE POLICY "learning_enrollment_owner_read" ON public.learning_enrollments
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "learning_enrollment_owner_create" ON public.learning_enrollments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "learning_enrollment_owner_update" ON public.learning_enrollments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE (user_id, event_id)
);
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_registrations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.event_registrations TO authenticated;
CREATE POLICY "event_registration_owner_read" ON public.event_registrations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "event_registration_owner_create" ON public.event_registrations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "event_registration_owner_update" ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.business_copilot_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_type text NOT NULL CHECK (draft_type IN ('reply', 'quote', 'marketing', 'note')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_copilot_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_copilot_drafts FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.business_copilot_drafts TO authenticated;
CREATE POLICY "business_draft_owner_read" ON public.business_copilot_drafts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "business_draft_owner_create" ON public.business_copilot_drafts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "business_draft_owner_delete" ON public.business_copilot_drafts
  FOR DELETE TO authenticated USING (user_id = auth.uid());
