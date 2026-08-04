-- ─── New Family Members (새가족반 출석 관리) ──────────────────
-- 새가족반(villages.is_new_member_team = true)의 리더가 다른 교회에서
-- 새로 오신 분을 회원가입 없이 직접 등록하고 1~6주차 출석을 관리한다.
-- 이 레코드는 users 계정과 별개이며, 6주차 과정을 마치면(졸업) 또는
-- 장기 미결 시 삭제(행 제거)된다.
--
-- 앱은 Supabase service role 키로 접근하고 권한은 API 계층에서
-- 검증하므로 별도의 RLS 정책은 사용하지 않는다(기존 테이블과 동일).

CREATE TABLE IF NOT EXISTS new_family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 담당 새가족반 리더
  name TEXT NOT NULL,                 -- 새가족 이름
  phone TEXT NOT NULL DEFAULT '',     -- 연락처
  birth_date DATE,                    -- 생년월일
  note TEXT NOT NULL DEFAULT '',      -- 메모(이전 교회, 특이사항 등)
  prayer_request TEXT NOT NULL DEFAULT '', -- 기도제목(새가족 전용, users와 분리)
  -- 1~6주차 출석 날짜. 값이 있으면 해당 주차 출석(몇월 몇째주는 날짜로 표시), NULL이면 미출석
  week1_date DATE,
  week2_date DATE,
  week3_date DATE,
  week4_date DATE,
  week5_date DATE,
  week6_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_new_family_members_leader
  ON new_family_members(leader_id);
CREATE INDEX IF NOT EXISTS idx_new_family_members_dept
  ON new_family_members(department_id);

-- 이미 테이블이 생성된 경우를 위한 안전한 컬럼 추가
ALTER TABLE new_family_members
  ADD COLUMN IF NOT EXISTS prayer_request TEXT NOT NULL DEFAULT '';
