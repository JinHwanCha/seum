-- Optional Supabase scheduler. Run AFTER add_native_push.sql and server deployment.
-- First create Vault secrets named seum_push_dispatch_url and seum_push_dispatch_secret.
-- URL: the full HTTPS URL ending in /api/push/dispatch.
-- Secret: exactly the deployed server's PUSH_DISPATCH_SECRET; do not put its value in Git.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.invoke_native_push_worker()
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE dispatch_url TEXT; dispatch_secret TEXT; request_id BIGINT;
BEGIN
  SELECT decrypted_secret INTO dispatch_url FROM vault.decrypted_secrets WHERE name = 'seum_push_dispatch_url';
  SELECT decrypted_secret INTO dispatch_secret FROM vault.decrypted_secrets WHERE name = 'seum_push_dispatch_secret';
  IF dispatch_url IS NULL OR dispatch_url !~ '^https://[^/]+/api/push/dispatch$'
    OR dispatch_secret IS NULL OR length(dispatch_secret) < 32 THEN
    RAISE EXCEPTION 'Configure the SEUM Push URL and dispatch secret in Supabase Vault first';
  END IF;
  SELECT net.http_post(
    url := dispatch_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || dispatch_secret),
    body := '{}'::jsonb, timeout_milliseconds := 65000
  ) INTO request_id;
  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_native_push_worker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_native_push_worker() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'seum_push_dispatch_url')
    OR NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'seum_push_dispatch_secret') THEN
    RAISE EXCEPTION 'Create the required SEUM Push Vault secrets before scheduling';
  END IF;
END;
$$;

SELECT cron.schedule('seum-native-push', '* * * * *', 'SELECT public.invoke_native_push_worker();');
COMMIT;
