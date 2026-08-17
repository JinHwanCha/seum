-- 사용자별 테마 색상 저장 (기기 간 동기화용)
-- 값이 없으면(NULL) 클라이언트의 localStorage 또는 기본 테마('green')를 사용합니다.
--
-- 참고: "relation \"users\" does not exist(42P01)" 오류가 나면
--   1) 아직 supabase/schema.sql 을 실행하지 않았거나
--   2) search_path 에 public 이 없는 상태에서 실행한 경우입니다.
-- 아래처럼 public 스키마를 명시하면 그 문제를 방지할 수 있습니다.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS theme TEXT;

-- 허용되는 테마 값만 저장되도록 제약 (선택 사항)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'users_theme_check'
      AND t.relname = 'users'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_theme_check
      CHECK (
        theme IS NULL OR theme IN (
          'green','light','dark','ocean','forest','sunset',
          'cherry','royal','midnight','amoled','retro'
        )
      );
  END IF;
END $$;
