-- ============================================================
-- 기도제목 "목사님(사역자)에게만 공개" 옵션 추가
--   is_pastor_only = true  → 사역자(minister)만 열람. 소그룹/마을 뷰에서는 숨김.
--   is_pastor_only = false → 기존 공개 범위(is_cell_only) 규칙을 따름.
--
-- 공개 범위(3단계) 매핑:
--   전체   : is_cell_only = false, is_pastor_only = false
--   소그룹 : is_cell_only = true,  is_pastor_only = false
--   목사님 : is_cell_only = false, is_pastor_only = true   (상호 배타)
-- ============================================================
-- ※ Supabase SQL Editor 에서 한 번에 실행해 주세요.
--   여러 번 실행해도 안전합니다 (idempotent).

ALTER TABLE prayer_requests
  ADD COLUMN IF NOT EXISTS is_pastor_only BOOLEAN DEFAULT false;

UPDATE prayer_requests SET is_pastor_only = false WHERE is_pastor_only IS NULL;

ALTER TABLE prayer_requests
  ALTER COLUMN is_pastor_only SET DEFAULT false;

ALTER TABLE prayer_requests
  ALTER COLUMN is_pastor_only SET NOT NULL;

-- 상호 배타 보장: 목사님 공개인 글은 소그룹 공개 플래그를 끈다.
UPDATE prayer_requests
  SET is_cell_only = false
  WHERE is_pastor_only = true AND is_cell_only = true;

-- (선택) 목사님 탭 조회 성능용 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_prayer_requests_pastor_only
  ON prayer_requests(department_id, week_start)
  WHERE is_pastor_only = true;
