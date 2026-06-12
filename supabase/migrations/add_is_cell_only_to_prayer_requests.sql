-- ============================================================
-- 기도제목 "소그룹에만 공개" 옵션 추가
--   true  → 같은 소그룹원, 마을장, 사역자만 열람
--   false → 마을 전체(같은 마을 소그룹원 포함) 열람 가능
-- ============================================================
-- ※ Supabase SQL Editor 에서 한 번에 실행해 주세요.
--   여러 번 실행해도 안전합니다 (idempotent).

ALTER TABLE prayer_requests
  ADD COLUMN IF NOT EXISTS is_cell_only BOOLEAN DEFAULT false;

UPDATE prayer_requests SET is_cell_only = false WHERE is_cell_only IS NULL;

ALTER TABLE prayer_requests
  ALTER COLUMN is_cell_only SET DEFAULT false;

ALTER TABLE prayer_requests
  ALTER COLUMN is_cell_only SET NOT NULL;
