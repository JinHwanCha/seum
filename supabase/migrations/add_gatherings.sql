-- ─── 모임 게시판 (Gathering Board) ────────────────────────────
-- 홈 탭의 [모임 게시판]에 직접 등록/수정하는 모임을 저장한다.
-- 구글 시트(CSV) 연동과 병행 사용하며, 이 테이블의 항목은
-- 사역자/국장단/관리자가 홈에서 직접 추가·수정·삭제할 수 있다.
--
-- 앱은 Supabase service role 키로 접근하고 권한은 API 계층에서
-- 검증하므로 별도의 RLS 정책은 사용하지 않는다(기존 테이블과 동일).

CREATE TABLE IF NOT EXISTS gatherings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                 -- 모임 이름/제목 ([태그] 포함 가능)
  link TEXT NOT NULL DEFAULT '',      -- 모임 링크 (신청/오픈채팅 URL)
  image_url TEXT NOT NULL DEFAULT '', -- 아이콘: 이미지 URL 또는 이모지 문자
  type TEXT NOT NULL DEFAULT '',      -- 모임 종류
  leader TEXT NOT NULL DEFAULT '',    -- 모임장
  kakao_id TEXT NOT NULL DEFAULT '',  -- 카톡 ID
  banner_url TEXT NOT NULL DEFAULT '',-- 상세 배너 이미지 URL
  content TEXT NOT NULL DEFAULT '',   -- 모임 내용
  button_label TEXT NOT NULL DEFAULT '', -- 버튼 이름
  disabled BOOLEAN NOT NULL DEFAULT false, -- 신청 마감 여부
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gatherings_dept
  ON gatherings(department_id, sort_order);
