BEGIN;

CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  provider TEXT NOT NULL CHECK (provider IN ('fcm', 'apns')),
  environment TEXT NOT NULL CHECK (environment IN ('production', 'sandbox')),
  token TEXT NOT NULL CHECK (length(token) BETWEEN 16 AND 4096),
  token_version UUID NOT NULL DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  session_expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, environment, token),
  CHECK ((platform = 'android' AND provider = 'fcm' AND environment = 'production')
    OR (platform = 'ios' AND provider = 'apns'))
);

CREATE INDEX IF NOT EXISTS idx_push_devices_user ON public.push_devices(user_id) WHERE enabled;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.push_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  device_version UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_id UUID,
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notification_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_jobs_pending ON public.push_jobs(available_at)
  WHERE status IN ('pending', 'processing');
ALTER TABLE public.push_jobs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.register_push_device(
  p_installation_id UUID, p_user_id UUID, p_platform TEXT, p_provider TEXT,
  p_environment TEXT, p_token TEXT, p_session_expires_at TIMESTAMPTZ
) RETURNS UUID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE result_id UUID;
BEGIN
  IF p_session_expires_at <= now() OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_user_id AND is_approved = true
  ) THEN
    RAISE EXCEPTION 'Push registration requires an active approved session';
  END IF;
  -- Serialize rare registration/rebinding operations, including reinstall token reuse.
  PERFORM pg_advisory_xact_lock(hashtextextended('seum_push_registration', 0));
  DELETE FROM public.push_devices
    WHERE provider = p_provider AND environment = p_environment AND token = p_token
      AND installation_id <> p_installation_id;
  INSERT INTO public.push_devices AS d
    (installation_id, user_id, platform, provider, environment, token, session_expires_at)
  VALUES (p_installation_id, p_user_id, p_platform, p_provider, p_environment, p_token, p_session_expires_at)
  ON CONFLICT (installation_id) DO UPDATE SET
    token_version = CASE WHEN d.user_id <> EXCLUDED.user_id OR d.token <> EXCLUDED.token
      OR d.provider <> EXCLUDED.provider OR d.environment <> EXCLUDED.environment OR NOT d.enabled
      THEN gen_random_uuid() ELSE d.token_version END,
    user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, provider = EXCLUDED.provider,
    environment = EXCLUDED.environment, token = EXCLUDED.token,
    enabled = true, session_expires_at = EXCLUDED.session_expires_at,
    last_seen_at = now(), updated_at = now()
  RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_notification_push()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.push_jobs(notification_id, device_id, device_version)
    SELECT NEW.id, d.id, d.token_version FROM public.push_devices d
    WHERE d.user_id = NEW.recipient_id AND d.enabled AND d.session_expires_at > now()
    ON CONFLICT (notification_id, device_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enqueue_notification_push ON public.notifications;
CREATE TRIGGER enqueue_notification_push AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_push();

CREATE OR REPLACE FUNCTION public.create_push_test_notification(p_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE result_id UUID; department UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('seum_push_test:' || p_user_id::TEXT, 0));
  SELECT department_id INTO department FROM public.users WHERE id = p_user_id AND is_approved;
  IF department IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.push_devices WHERE user_id = p_user_id AND enabled AND session_expires_at > now()
  ) THEN RAISE EXCEPTION 'NO_PUSH_DEVICE'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.notifications WHERE recipient_id = p_user_id
      AND type = 'announcement' AND title = '세움 Push 테스트' AND created_at > now() - interval '1 minute'
  ) THEN RAISE EXCEPTION 'PUSH_TEST_RATE_LIMIT'; END IF;
  INSERT INTO public.notifications(department_id, recipient_id, actor_id, type, title, body)
    VALUES (department, p_user_id, p_user_id, 'announcement', '세움 Push 테스트', '앱 알림 연결 확인용입니다.')
    RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_push_jobs(p_limit INTEGER DEFAULT 5)
RETURNS SETOF public.push_jobs LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.push_jobs j SET status = 'cancelled', last_error = 'Device or notification no longer eligible'
    FROM public.push_devices d, public.notifications n
    WHERE j.device_id = d.id AND j.notification_id = n.id
      AND j.status IN ('pending', 'processing')
      AND (j.status = 'pending' OR j.lease_until < now())
      AND (NOT d.enabled OR d.token_version <> j.device_version OR d.user_id <> n.recipient_id
        OR d.session_expires_at <= now() OR n.is_read OR j.created_at < now() - interval '24 hours');
  UPDATE public.push_jobs SET status = 'failed', last_error = 'Retry limit reached'
    WHERE attempts >= 8 AND (status = 'pending' OR (status = 'processing' AND lease_until < now()));
  RETURN QUERY
    WITH candidates AS (
      SELECT id FROM public.push_jobs
      WHERE attempts < 8 AND (
        (status = 'pending' AND available_at <= now()) OR
        (status = 'processing' AND lease_until < now())
      )
      ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT LEAST(GREATEST(p_limit, 1), 5)
    )
    UPDATE public.push_jobs j SET status = 'processing', attempts = attempts + 1,
      lease_id = gen_random_uuid(), lease_until = now() + interval '5 minutes'
    FROM candidates c WHERE j.id = c.id RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_push_job(
  p_id UUID, p_lease_id UUID, p_outcome TEXT, p_error TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SET search_path = public AS $$
DECLARE job public.push_jobs;
BEGIN
  SELECT * INTO job FROM public.push_jobs WHERE id = p_id AND status = 'processing'
    AND lease_id = p_lease_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_outcome IS NULL OR p_outcome NOT IN ('sent', 'retry', 'invalid', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid push outcome';
  END IF;
  IF p_outcome = 'invalid' THEN
    UPDATE public.push_devices SET enabled = false, updated_at = now()
      WHERE id = job.device_id AND token_version = job.device_version;
  END IF;
  UPDATE public.push_jobs SET
    status = CASE WHEN p_outcome = 'sent' THEN 'sent'
      WHEN p_outcome = 'cancelled' THEN 'cancelled'
      WHEN p_outcome = 'retry' AND job.attempts < 8 THEN 'pending' ELSE 'failed' END,
    available_at = now() + make_interval(secs => LEAST(3600, (30 * power(2, job.attempts - 1))::INTEGER)),
    sent_at = CASE WHEN p_outcome = 'sent' THEN now() ELSE NULL END,
    last_error = left(p_error, 500), lease_id = NULL, lease_until = NULL
    WHERE id = job.id;
  RETURN true;
END;
$$;

REVOKE ALL ON public.push_devices, public.push_jobs FROM anon, authenticated;
GRANT ALL ON public.push_devices, public.push_jobs TO service_role;
REVOKE ALL ON FUNCTION public.register_push_device(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_notification_push() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_push_test_notification(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_push_jobs(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_push_job(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_push_device(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_notification_push() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_push_test_notification(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_push_jobs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_push_job(UUID, UUID, TEXT, TEXT) TO service_role;

COMMIT;
