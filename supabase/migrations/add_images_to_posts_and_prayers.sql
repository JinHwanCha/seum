-- ============================================================
-- 게시글 / 기도제목 이미지 첨부 기능
-- 이미지는 클라이언트에서 10KB 이하로 압축된 base64 data URL
-- 형태로 저장됩니다 (Supabase Storage 미사용).
-- ============================================================
-- ※ Supabase SQL Editor 에서 "Failed to fetch (api.supabase.com)" 오류가
--   뜨면 일시적인 네트워크/타임아웃 문제이므로,
--   페이지 새로고침 후 아래 1) 와 2) 를 따로따로(한 블록씩) 실행해 주세요.

-- ─────────────────────────────────────────────────────────────
-- 1) posts 테이블
-- ─────────────────────────────────────────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS images TEXT[];

UPDATE posts SET images = '{}' WHERE images IS NULL;

ALTER TABLE posts
  ALTER COLUMN images SET DEFAULT '{}';

ALTER TABLE posts
  ALTER COLUMN images SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2) prayer_requests 테이블
-- ─────────────────────────────────────────────────────────────
ALTER TABLE prayer_requests
  ADD COLUMN IF NOT EXISTS images TEXT[];

UPDATE prayer_requests SET images = '{}' WHERE images IS NULL;

ALTER TABLE prayer_requests
  ALTER COLUMN images SET DEFAULT '{}';

ALTER TABLE prayer_requests
  ALTER COLUMN images SET NOT NULL;
