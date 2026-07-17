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
  images: string[];
  is_cell_only: boolean;
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
  images: string[];
  gathering_type: string | null;
  visibility: 'all' | 'village';
  village_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: User;
  category?: BoardCategory;
  village?: { id: string; name: string } | null;
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
  prayer_count: number;
  qt_count: number;
  bible_reading: boolean;
  checked_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── 목장 나눔지 (Sharing Sheet) ───
export type SharingSheetSource = 'google_sheet' | 'manual';
export type SharingSectionStyle = 'numbered' | 'bullet';

export interface SharingSheetSection {
  label: string;
  style: SharingSectionStyle;
  items: string[];
}

export interface SharingSheetContent {
  title: string;
  subtitle?: string;
  scripture: string;
  scriptureBody?: string;
  preacher?: string;
  sections: SharingSheetSection[];
}

// ─── 모임 게시판 (Gathering Board) ───
export interface GatheringItem {
  id: string;
  name: string;        // 모임 이름 (예: "[⭐찬양팀] 찬양팀원 모집")
  link: string;        // 모임 링크 (신청/오픈채팅 URL)
  imageUrl: string;    // 이미지 url (아이콘/이모지 이미지)
  type: string;        // 모임 종류
  leader: string;      // 모임장
  kakaoId: string;     // 카톡 ID
  bannerUrl: string;   // 모임 이미지 (상세 배너)
  content: string;     // 모임 내용
  buttonLabel: string; // 버튼 이름
  disabled: boolean;   // 모임 신청 마감 여부
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
