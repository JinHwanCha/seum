// ─── Role Types ───
export type Role = 'pending' | 'cell_member' | 'cell_leader' | 'village_leader' | 'minister';
export type MinisterRank = 'pastor' | 'associate_pastor' | 'evangelist' | 'secretary';
export type BoardType = 'notice' | 'sharing' | 'gathering' | 'intercession';

// ─── Database Models ───
export interface Church {
  id: string;
  name: string;
  slug: string;
  pastor_name: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  church_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface RoleLabel {
  id: string;
  department_id: string;
  role_key: string;
  label: string;
}

export interface GroupYear {
  id: string;
  department_id: string;
  year: number;
  is_active: boolean;
  created_at: string;
}

export interface Village {
  id: string;
  group_year_id: string;
  name: string;
  is_new_member_team: boolean;
  sort_order: number;
  created_at: string;
}

export interface Cell {
  id: string;
  village_id: string;
  name: string | null;
  sort_order: number;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  birth_date: string | null;
  phone: string | null;
  password_hash?: string;
  church_id: string;
  department_id: string;
  role: Role;
  minister_rank: MinisterRank | null;
  village_id: string | null;
  cell_id: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface BureauType {
  id: string;
  department_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface BureauMember {
  id: string;
  bureau_type_id: string;
  user_id: string;
  is_leader: boolean;
}

export interface PrayerRequest {
  id: string;
  user_id: string;
  department_id: string;
  week_start: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface BoardCategory {
  id: string;
  department_id: string;
  board_type: BoardType;
  name: string;
  sort_order: number;
}

export interface Post {
  id: string;
  department_id: string;
  board_type: BoardType;
  category_id: string | null;
  author_id: string;
  title: string;
  content: string;
  gathering_type: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: User;
  category?: BoardCategory;
  _count?: { comments: number; reactions: number };
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: User;
  replies?: Comment[];
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// ─── Attendance ───
export type WorshipService = '1부' | '2부' | '3부';

export interface Attendance {
  id: string;
  user_id: string;
  department_id: string;
  week_start: string;
  worship_service: WorshipService | null;
  department_meeting: boolean;
  small_group: boolean;
  checked_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Session / Auth ───
export interface SessionPayload {
  userId: string;
  name: string;
  churchId: string;
  churchSlug: string;
  departmentId: string;
  departmentSlug: string;
  role: Role;
  ministerRank: MinisterRank | null;
  villageId: string | null;
  cellId: string | null;
  isBureauLeader: boolean;
  isBureauMember: boolean;
  isAdmin: boolean;
}

// ─── API Response ───
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
