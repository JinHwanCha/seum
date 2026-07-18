-- ============================================================
-- attendance.worship_service 에 '온라인' 옵션 허용
--   기존 CHECK 제약이 1/2/3부만 허용하는 경우를 대비한 보정.
--   현장(1/2/3부) vs 온라인 예배 통계를 구분하기 위해 필요.
-- ※ Supabase SQL Editor 에서 한 번에 실행. (idempotent)
-- ============================================================

-- 기존 제약(이름이 다를 수 있어 자동 탐색 후 제거)
DO $$
DECLARE
  conname TEXT;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'attendance'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%worship_service%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE attendance DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_worship_service_check
  CHECK (worship_service IS NULL OR worship_service IN ('1부', '2부', '3부', '온라인'));

-- 통계 조회 성능용 인덱스 (있으면 무시)
CREATE INDEX IF NOT EXISTS idx_attendance_dept_week ON attendance(department_id, week_start);
