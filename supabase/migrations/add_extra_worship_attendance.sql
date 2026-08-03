-- 추가 예배 출석: 수요예배 / 센터워십(금요예배) / 새벽기도
-- 각 컬럼: NULL(미참석) | '현장' | '온라인'  (attendance.worship_service 패턴과 동일)

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS wednesday_worship TEXT
    CHECK (wednesday_worship IS NULL OR wednesday_worship IN ('현장', '온라인')),
  ADD COLUMN IF NOT EXISTS friday_worship TEXT
    CHECK (friday_worship IS NULL OR friday_worship IN ('현장', '온라인')),
  ADD COLUMN IF NOT EXISTS dawn_prayer TEXT
    CHECK (dawn_prayer IS NULL OR dawn_prayer IN ('현장', '온라인'));
