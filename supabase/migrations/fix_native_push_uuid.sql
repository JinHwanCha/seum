-- Repair installed Push functions without relying on the uuid-ossp extension schema.
-- Existing users, device registrations, notification data and jobs are preserved.
BEGIN;

ALTER TABLE public.push_devices ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.push_devices ALTER COLUMN token_version SET DEFAULT gen_random_uuid();
ALTER TABLE public.push_jobs ALTER COLUMN id SET DEFAULT gen_random_uuid();

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

COMMIT;
