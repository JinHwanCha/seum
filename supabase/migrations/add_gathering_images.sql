-- ─── 모임 게시판: 여러 장 이미지 (슬라이드) ────────────────────
-- gatherings 테이블에 순서가 있는 이미지 배열을 추가한다.
-- 배열의 순서 = 팝업 슬라이드에서 보여지는 순서.
-- 관리 화면에서 추가/삭제/순서 이동/역순 정렬로 자유롭게 바꾼다.
-- 이미지는 앱의 다른 게시물과 동일하게 압축된 data URL 문자열로 저장된다.

ALTER TABLE gatherings
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
