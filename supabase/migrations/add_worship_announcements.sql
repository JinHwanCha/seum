-- ─── 주일 예배 안내 (Worship Guide) ───────────────────────────
-- 홈 상단 [주일 예배 안내] 섹션의 버튼들을 저장한다. 부서별로 관리한다.
--
--   고정 버튼(key IS NOT NULL): 'assembly'(집회 안내), 'intercession'(중보기도회),
--                               'youth_ad'(청년부 광고), 'kakao'(카카오 채널)
--     → 삭제 불가, 사역자/국장단/관리자가 내용만 수정. DB에 행이 없으면 앱이
--        기본값을 보여주고, 처음 저장할 때 행이 생성된다.
--   특별 광고(key IS NULL): 매주 새로 생기는 이벤트 광고. 여러 개 가능하며
--     pinned=true 로 섹션 맨 앞에 고정 노출.
--
-- kind:
--   'timetable'  → content.rows[] (소요/프로그램/내용/인도자/특이사항) + images
--   'prayer'     → content.sections[] (번호형 기도제목) + images
--   'slideshow'  → images(슬라이드) + content.sections[](선택 광고 텍스트)
--   'link'       → link (카카오 채널 등)
--
-- 이미지는 앱의 다른 게시물과 동일하게 압축된 data URL 문자열 배열로 저장한다.
-- 앱은 service_role 키로만 접근하므로 RLS 정책은 두지 않는다(deny-all).

CREATE TABLE IF NOT EXISTS worship_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  key TEXT,                                  -- 고정 버튼 키 또는 NULL(특별 광고)
  kind TEXT NOT NULL DEFAULT 'slideshow',    -- timetable | prayer | slideshow | link
  title TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',             -- 이모지 또는 이미지 URL
  images JSONB NOT NULL DEFAULT '[]'::jsonb, -- 순서 있는 슬라이드 이미지 배열
  content JSONB NOT NULL DEFAULT '{}'::jsonb,-- kind별 구조화 콘텐츠
  link TEXT NOT NULL DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT false,     -- 특별 광고 맨 앞 고정
  enabled BOOLEAN NOT NULL DEFAULT true,     -- false면 일반 유저에게 숨김
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 부서별 고정 버튼은 key 당 1개만 존재. (key IS NULL 인 특별 광고는 제한 없음)
CREATE UNIQUE INDEX IF NOT EXISTS uq_worship_dept_key
  ON worship_announcements(department_id, key)
  WHERE key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_worship_dept
  ON worship_announcements(department_id, sort_order);

ALTER TABLE worship_announcements ENABLE ROW LEVEL SECURITY;
