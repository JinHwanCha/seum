-- ============================================================
-- [주일 예배 안내] 고정 버튼 '카카오 채널' → 'SNS' 로 전환
--   기존 key='kakao' 버튼은 단일 링크(kind='link')였으나,
--   이제 Instagram / 카카오톡 / YouTube 3개 링크를 담는
--   kind='sns' 버튼으로 바뀐다.
--
--   URL은 별도 컬럼이 아니라 기존 content(JSONB)에 저장한다.
--     content.sns = { instagram, kakao, youtube }
--   따라서 테이블 스키마 변경(ALTER)은 필요 없다.
--
--   이 마이그레이션은 이미 저장돼 있던 기존 kakao 버튼 행을
--   새 형식으로 백필(backfill)한다.
--     · kind 를 'sns' 로 변경
--     · 기존 link 를 content.sns.kakao 로 이관
--     · instagram / youtube 는 기본값으로 채움(비어 있을 때만)
--   앱은 읽을 때도 자동 보정하므로 이 스크립트는 선택 사항이지만,
--   DB를 깔끔하게 유지하기 위해 실행을 권장한다.
-- ※ Supabase SQL Editor 에서 한 번에 실행. (idempotent)
-- ============================================================

UPDATE worship_announcements
SET
  kind = 'sns',
  content = jsonb_set(
    COALESCE(content, '{}'::jsonb),
    '{sns}',
    jsonb_build_object(
      'instagram', COALESCE(NULLIF(content #>> '{sns,instagram}', ''), 'https://www.instagram.com/naesoofishermen/'),
      'kakao',     COALESCE(NULLIF(content #>> '{sns,kakao}', ''), NULLIF(link, ''), 'https://pf.kakao.com/_xibZxhC'),
      'youtube',   COALESCE(NULLIF(content #>> '{sns,youtube}', ''), 'https://www.youtube.com/@naesoofishermen')
    ),
    true
  ),
  link = '',
  updated_at = NOW()
WHERE key = 'kakao';
