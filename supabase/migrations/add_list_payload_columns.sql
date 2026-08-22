-- ============================================================
-- 목록 응답 페이로드 축소용 파생 컬럼
-- 게시글/예배안내는 이미지를 base64 문자열로 인라인 저장하므로,
-- 목록에서 이미지 배열 전체를 내려받으면 응답이 수 MB로 커진다.
-- 아래 "생성 컬럼(GENERATED ... STORED)"은 쓰기 시 자동 유지되므로
-- 애플리케이션 코드가 따로 관리할 필요가 없다.
-- 목록 쿼리는 무거운 images 대신 thumbnail/image_count 만 조회한다.
--
-- ※ Supabase SQL Editor 에서 "Failed to fetch" 가 뜨면 일시적 오류이니
--   새로고침 후 아래 블록을 하나씩 실행하세요.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) posts (images: TEXT[])
-- ─────────────────────────────────────────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS image_count INT
    GENERATED ALWAYS AS (COALESCE(array_length(images, 1), 0)) STORED;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS thumbnail TEXT
    GENERATED ALWAYS AS (images[1]) STORED;

-- ─────────────────────────────────────────────────────────────
-- 2) worship_announcements (images: JSONB) — 개수만 필요
-- ─────────────────────────────────────────────────────────────
ALTER TABLE worship_announcements
  ADD COLUMN IF NOT EXISTS image_count INT
    GENERATED ALWAYS AS (
      CASE WHEN jsonb_typeof(images) = 'array' THEN jsonb_array_length(images) ELSE 0 END
    ) STORED;

-- ─────────────────────────────────────────────────────────────
-- 3) 목록 정렬/필터 최적화용 복합 인덱스
--    posts 목록: department_id + board_type 필터, is_pinned/created_at 정렬
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_dept_type_sort
  ON posts(department_id, board_type, is_pinned DESC, created_at DESC);
