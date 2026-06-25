-- ─── 목장 나눔지 (Sharing Sheet) ──────────────────────────────
-- 부서별로 1개의 나눔지를 저장한다.
--   source = 'google_sheet' → 구글 시트(CSV)에서 불러옴
--   source = 'manual'       → 아래 content(JSONB)를 직접 사용
-- content 구조 예시:
-- {
--   "title": "...",
--   "subtitle": "...",
--   "scripture": "요17:4,14-23",
--   "scriptureBody": "4 아버지께서 ...",
--   "preacher": "박지웅 담임목사",
--   "sections": [
--     { "label": "본문 질문", "style": "numbered", "items": ["...", "..."] },
--     { "label": "적용", "style": "bullet", "items": ["..."] }
--   ]
-- }

CREATE TABLE IF NOT EXISTS sharing_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'google_sheet',
  google_sheet_id TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id)
);
