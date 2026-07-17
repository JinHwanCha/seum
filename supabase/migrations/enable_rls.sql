-- ============================================================
-- RLS 활성화 (Supabase 보안 권고: "RLS Disabled in Public")
-- ============================================================
-- 이 앱은 서버에서 service_role 키로만 Supabase에 접근한다
-- (src/lib/supabase.ts). service_role 은 RLS 를 '우회(BYPASSRLS)'
-- 하므로, RLS 를 켜고 정책(policy)을 만들지 않으면:
--   - anon / authenticated (공개 PostgREST API) → 전면 차단(deny-all)
--   - 서버(service_role)                        → 기존과 동일하게 전체 접근
-- 즉, 앱 동작에는 영향이 없고 공개 API 노출만 막힌다.
--
-- ⚠️ 만약 나중에 브라우저에서 anon 키로 직접 Supabase 를 호출하는
--    기능을 추가한다면, 그때는 각 테이블에 실제 policy 를 정의해야 한다.

-- public 스키마의 모든 테이블에 RLS 활성화 (attendance 포함)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
