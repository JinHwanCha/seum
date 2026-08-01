-- ============================================================
-- 비밀번호 초기화 요청 테이블 (password_reset_requests)
-- ------------------------------------------------------------
-- 로그인 화면 "비밀번호를 잊으셨나요?" 로 접수된 초기화 요청을 저장.
-- 사역자/관리자가 /admin 회원 관리 > 초기화 탭에서 승인하면
-- 해당 회원의 비밀번호가 0000 으로 초기화된다.
--
-- schema.sql 에는 정의되어 있으나 기존 운영 DB 에는 생성되지 않아
-- 요청 INSERT 가 실패하던 문제를 해결하기 위한 마이그레이션.
-- 이미 존재해도 안전하게 재실행 가능하도록 IF NOT EXISTS 사용.
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_church_status
  ON password_reset_requests(church_id, status);

-- 앱은 서버에서 service_role 키로만 접근하므로 RLS 를 켜도 동작에 영향 없음.
-- (공개 anon/authenticated API 노출만 차단)
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
