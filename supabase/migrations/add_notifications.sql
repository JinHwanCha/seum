-- ============================================================
-- 알림(Notifications) 기능
--   * 댓글/이모지 반응 → 게시글 작성자에게 개인 알림
--   * 사역자 공지 '모두에게 알림' → 부서 전원에게 방송 알림
--   * 홈 진입 시 미확인 공지 알림 팝업(닫으면 is_read=true 로 다시 안뜸)
-- ============================================================
-- ※ Supabase SQL Editor 에서 한 번에 실행해 주세요. (idempotent)

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- 알림을 받는 사람
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,               -- 알림을 발생시킨 사람
  type TEXT NOT NULL CHECK (type IN ('comment', 'reaction', 'announcement')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  board_type TEXT,                                                     -- 링크 생성용 (notice/sharing/...)
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications(recipient_id, is_read);

-- ============================================================
-- 레거시 웹푸시 구독 예약 테이블(현재 코드에서는 사용하지 않음).
-- 네이티브 Push는 add_native_push.sql의 push_devices/push_jobs와
-- /api/push/devices, /api/push/dispatch를 사용한다. 이 테이블은 유지한다.
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  platform TEXT,                 -- 'web' | 'ios' | 'android'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);
