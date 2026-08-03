-- 새벽기도 리뉴얼: 월~금 일별 출석 (각 컬럼 NULL(미참석) | '현장' | '온라인')
-- 기존 단일 dawn_prayer 컬럼을 요일별 5개 컬럼으로 교체한다.

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS dawn_mon TEXT
    CHECK (dawn_mon IS NULL OR dawn_mon IN ('현장', '온라인')),
  ADD COLUMN IF NOT EXISTS dawn_tue TEXT
    CHECK (dawn_tue IS NULL OR dawn_tue IN ('현장', '온라인')),
  ADD COLUMN IF NOT EXISTS dawn_wed TEXT
    CHECK (dawn_wed IS NULL OR dawn_wed IN ('현장', '온라인')),
  ADD COLUMN IF NOT EXISTS dawn_thu TEXT
    CHECK (dawn_thu IS NULL OR dawn_thu IN ('현장', '온라인')),
  ADD COLUMN IF NOT EXISTS dawn_fri TEXT
    CHECK (dawn_fri IS NULL OR dawn_fri IN ('현장', '온라인'));

-- 기존 주 단위 단일 새벽기도 컬럼 제거
ALTER TABLE attendance DROP COLUMN IF EXISTS dawn_prayer;
