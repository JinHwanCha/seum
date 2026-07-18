-- ============================================================
-- 성경(Bible) 기능 테이블
--   1) bible_reading_progress : 유저별 장(chapter) 읽음 기록 (읽기표)
--   2) bible_bookmarks        : 유저별 북마크 / 형광펜(하이라이트)
--   3) bible_verse_cache      : iBibles에서 불러온 본문 캐시 (단어 검색용)
-- ※ Supabase SQL Editor 에서 한 번에 실행해 주세요. (idempotent)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 읽기표: 어떤 유저가 어떤 책/장을 읽었는지 ───────────────
CREATE TABLE IF NOT EXISTS bible_reading_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  book TEXT NOT NULL,          -- 책 코드 (예: 'john', 'genesis')
  chapter INT NOT NULL,        -- 장 번호
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book, chapter)
);

CREATE INDEX IF NOT EXISTS idx_bible_progress_user ON bible_reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_bible_progress_dept ON bible_reading_progress(department_id);

-- ─── 북마크 / 형광펜 ─────────────────────────────────────────
--   type = 'bookmark' → 즐겨찾기 구절
--   type = 'highlight' → 형광펜 (color 사용)
CREATE TABLE IF NOT EXISTS bible_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bookmark',   -- 'bookmark' | 'highlight'
  color TEXT DEFAULT 'yellow',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book, chapter, verse, type)
);

CREATE INDEX IF NOT EXISTS idx_bible_bookmarks_user ON bible_bookmarks(user_id);

-- ─── 본문 캐시 (단어 검색 인덱스) ────────────────────────────
--   유저가 읽은 본문을 캐시로 저장 → 단어 검색시 사용
CREATE TABLE IF NOT EXISTS bible_verse_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL DEFAULT 'kor',
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(version, book, chapter, verse)
);

CREATE INDEX IF NOT EXISTS idx_bible_cache_lookup ON bible_verse_cache(version, book, chapter);
CREATE INDEX IF NOT EXISTS idx_bible_cache_text ON bible_verse_cache USING gin (to_tsvector('simple', text));
