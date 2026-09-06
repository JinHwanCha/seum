-- ─── 게시글 짧은 URL(slug) ──────────────────────────────────
-- posts.id(UUID)는 그대로 유지한다(모든 FK·기존 링크 100% 호환).
-- slug 는 URL 표시 전용의 짧은 랜덤 문자열이며, 추측 불가능해 기존 보안
-- 모델(추측 불가 URL)을 그대로 유지한다.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug TEXT;

-- 기존 게시글 백필: 10자 랜덤 문자열(패딩/특수문자 제거).
-- 행마다 gen_random_bytes 가 독립 평가되어 사실상 중복이 없다.
UPDATE posts
SET slug = substr(translate(encode(gen_random_bytes(9), 'base64'), '+/=', 'xyz'), 1, 10)
WHERE slug IS NULL;

-- 유니크 인덱스(있으면 재생성 생략). NULL 은 여러 개 허용되므로
-- 혹시 백필이 누락돼도 앞으로의 삽입만 유일성을 강제한다.
CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_key ON posts (slug);
