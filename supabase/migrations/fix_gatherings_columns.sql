-- ============================================================
-- 모임 게시판(gatherings) 스키마 정합성 보정 (idempotent, 안전)
-- 증상: 홈 [모임 게시판]에서 "모임 추가하기"가 실패
-- 원인: gatherings 테이블에 일부 컬럼(특히 images)이 없어서 INSERT 실패
--       (add_gatherings.sql 만 실행하고 add_gathering_images.sql 을 안 돌린 경우 등)
-- 조치: 테이블이 없으면 생성하고, 있으면 누락 컬럼을 모두 채운다.
--       이미 있는 컬럼/인덱스는 건드리지 않는다.
-- ============================================================

-- 테이블이 없으면 전체 생성
CREATE TABLE IF NOT EXISTS gatherings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  leader TEXT NOT NULL DEFAULT '',
  kakao_id TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '',
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  content TEXT NOT NULL DEFAULT '',
  button_label TEXT NOT NULL DEFAULT '',
  disabled BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 이미 있던 테이블에 누락 컬럼 보강
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS link         TEXT    NOT NULL DEFAULT '';
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS image_url    TEXT    NOT NULL DEFAULT '';
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS type         TEXT    NOT NULL DEFAULT '';
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS leader       TEXT    NOT NULL DEFAULT '';
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS kakao_id     TEXT    NOT NULL DEFAULT '';
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS banner_url   TEXT    NOT NULL DEFAULT '';
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS images       JSONB   NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS content      TEXT    NOT NULL DEFAULT '';
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS button_label TEXT    NOT NULL DEFAULT '';
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS disabled     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS sort_order   INT     NOT NULL DEFAULT 0;
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE gatherings ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_gatherings_dept ON gatherings(department_id, sort_order);

-- RLS (서버는 service_role 로 우회, 공개 API 는 deny-all)
ALTER TABLE gatherings ENABLE ROW LEVEL SECURITY;
