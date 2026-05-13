-- ============================================================
-- 게시글 마을공개/전체공개 가시성 + 마을별 카테고리 기능
-- 대상: 나눔(sharing) / 모임(gathering) / 기도제목(intercession)
--   * 공지(notice) 도 컬럼은 동일하게 가지지만 항상 'all' 로 작성됨
-- ============================================================
-- ※ Supabase SQL Editor 에서 한 번에 실행해 주세요.
--   여러 번 실행해도 안전합니다 (idempotent).

-- 1) visibility 컬럼 (전체공개 / 마을공개)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all';

-- 2) village_id 컬럼 (마을공개 시 소속 마을 ID, 전체공개는 NULL 허용)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS village_id UUID REFERENCES villages(id) ON DELETE SET NULL;

-- 3) visibility 값 제약 ('all' or 'village') — 이미 있으면 무시
DO $$
BEGIN
  ALTER TABLE posts
    ADD CONSTRAINT posts_visibility_check CHECK (visibility IN ('all', 'village'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 4) 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_dept_type_visibility
  ON posts(department_id, board_type, visibility);

CREATE INDEX IF NOT EXISTS idx_posts_village
  ON posts(village_id);
