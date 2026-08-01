-- ============================================================
-- 게시글 공개 범위에 '목사님(pastor)' 옵션 추가
--   visibility = 'pastor' → 사역자(minister)와 작성자 본인만 열람
--   대상 게시판: 나눔(sharing) / 모임(gathering) / 기도제목(intercession)
-- ============================================================
-- ※ Supabase SQL Editor 에서 한 번에 실행해 주세요.
--   여러 번 실행해도 안전합니다 (idempotent).

-- visibility CHECK 제약을 'all' / 'village' / 'pastor' 로 확장
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_visibility_check;

ALTER TABLE posts
  ADD CONSTRAINT posts_visibility_check CHECK (visibility IN ('all', 'village', 'pastor'));
