-- ============================================================
-- SEUM 웹앱 - Supabase Database Schema
-- 교회 공동체 나눔 플랫폼
-- ============================================================

-- UUID 확장
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Churches (교회) ─────────────────────────────────────────
CREATE TABLE churches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  pastor_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Departments (부서) ──────────────────────────────────────
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, slug)
);

-- ─── Role Labels (직급 명칭 - 교회별 커스텀) ─────────────────
CREATE TABLE role_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  label TEXT NOT NULL,
  UNIQUE(department_id, role_key)
);

-- ─── Group Years (연도별 그룹 관리) ──────────────────────────
CREATE TABLE group_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  year INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, year)
);

-- ─── Villages (마을/대그룹) ──────────────────────────────────
CREATE TABLE villages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_year_id UUID NOT NULL REFERENCES group_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_new_member_team BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cells (소그룹) ──────────────────────────────────────────
CREATE TABLE cells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
  name TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Users (사용자) ──────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  church_id UUID NOT NULL REFERENCES churches(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  role TEXT NOT NULL DEFAULT 'pending'
    CHECK (role IN ('pending', 'cell_member', 'cell_leader', 'village_leader', 'minister')),
  minister_rank TEXT
    CHECK (minister_rank IS NULL OR minister_rank IN ('pastor', 'associate_pastor', 'evangelist', 'secretary')),
  village_id UUID REFERENCES villages(id) ON DELETE SET NULL,
  cell_id UUID REFERENCES cells(id) ON DELETE SET NULL,
  is_approved BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_graduated BOOLEAN DEFAULT false,
  graduated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Bureau Types (국장단 종류) ──────────────────────────────
CREATE TABLE bureau_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  UNIQUE(department_id, slug)
);

-- ─── Bureau Members (국장단 구성원) ──────────────────────────
CREATE TABLE bureau_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bureau_type_id UUID NOT NULL REFERENCES bureau_types(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_leader BOOLEAN DEFAULT false,
  UNIQUE(bureau_type_id, user_id)
);

-- ─── Prayer Requests (기도제목) ──────────────────────────────
CREATE TABLE prayer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id),
  week_start DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ─── Board Categories (게시판 카테고리) ──────────────────────
CREATE TABLE board_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  board_type TEXT NOT NULL
    CHECK (board_type IN ('notice', 'sharing', 'gathering', 'intercession')),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- ─── Posts (게시글) ──────────────────────────────────────────
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id),
  board_type TEXT NOT NULL
    CHECK (board_type IN ('notice', 'sharing', 'gathering', 'intercession')),
  category_id UUID REFERENCES board_categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  gathering_type TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Comments (댓글) ────────────────────────────────────────
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reactions (반응) ────────────────────────────────────────
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX idx_users_church ON users(church_id);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_village ON users(village_id);
CREATE INDEX idx_users_cell ON users(cell_id);
CREATE INDEX idx_users_approved ON users(is_approved);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_church_name ON users(church_id, name);
CREATE INDEX idx_users_church_phone ON users(church_id, phone);
CREATE INDEX idx_users_cell_role ON users(cell_id, role);
CREATE INDEX idx_users_cell_approved ON users(cell_id, is_approved);
CREATE INDEX idx_prayer_requests_dept_week ON prayer_requests(department_id, week_start);
CREATE INDEX idx_prayer_requests_user ON prayer_requests(user_id);
CREATE INDEX idx_prayer_requests_user_week ON prayer_requests(user_id, week_start);
CREATE INDEX idx_posts_dept_type ON posts(department_id, board_type);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_reactions_post ON reactions(post_id);
CREATE INDEX idx_villages_group_year ON villages(group_year_id);
CREATE INDEX idx_cells_village ON cells(village_id);
CREATE INDEX idx_bureau_members_user ON bureau_members(user_id);
CREATE INDEX idx_bureau_members_bureau_type ON bureau_members(bureau_type_id);
CREATE INDEX idx_board_categories_dept ON board_categories(department_id, board_type);
CREATE INDEX idx_group_years_dept_active ON group_years(department_id, is_active);

-- ─── Password Reset Requests (비밀번호 초기화 요청) ──────────
CREATE TABLE password_reset_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_password_reset_church_status ON password_reset_requests(church_id, status);

-- ─── Attendance (출석체크) ────────────────────────────────────
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  worship_service TEXT CHECK (worship_service IS NULL OR worship_service IN ('1부', '2부', '3부')),
  department_meeting BOOLEAN DEFAULT false,
  small_group BOOLEAN DEFAULT false,
  prayer_count INT DEFAULT 0,
  qt_count INT DEFAULT 0,
  bible_reading BOOLEAN DEFAULT false,
  checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_attendance_dept_week ON attendance(department_id, week_start);
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_user_week ON attendance(user_id, week_start);
