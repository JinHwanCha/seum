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
export type WorshipService = '1부' | '2부' | '3부' | '온라인';

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
export type GatheringSource = 'sheet' | 'db';

export interface GatheringItem {
  id: string;
  source: GatheringSource; // 'sheet' = 구글시트, 'db' = 직접 등록
  name: string;        // 모임 이름 (예: "[⭐찬양팀] 찬양팀원 모집")
  link: string;        // 모임 링크 (신청/오픈채팅 URL)
  imageUrl: string;    // 이미지 url (아이콘/이모지 이미지)
  type: string;        // 모임 종류
  leader: string;      // 모임장
  kakaoId: string;     // 카톡 ID
  bannerUrl: string;   // 모임 이미지 (상세 배너, 구글시트 호환용)
  images: string[];    // 상세 팝업 슬라이드 이미지(순서 있는 배열)
  content: string;     // 모임 내용
  buttonLabel: string; // 버튼 이름
  disabled: boolean;   // 모임 신청 마감 여부
}

// ─── 주일 예배 안내 (Worship Guide) ───
export type WorshipKind = 'timetable' | 'prayer' | 'slideshow' | 'link';

// 집회 안내 타임테이블 한 행
export interface WorshipTimetableRow {
  duration: string; // 소요
  program: string;  // 프로그램
  detail: string;   // 내용 (줄바꿈으로 여러 항목)
  leader: string;   // 인도자
  remark: string;   // 특이사항
}

// 중보기도회 기도제목 / 광고 텍스트 섹션 (번호형)
export interface WorshipSection {
  title: string;    // 큰 제목 (1., 2., ...)
  items: string[];  // 하위 항목들
}

export interface WorshipContent {
  subtitle?: string;              // 날짜/장소 등 부제
  note?: string;                  // 하단 안내 문구
  rows?: WorshipTimetableRow[];   // timetable
  sections?: WorshipSection[];    // prayer / slideshow 광고 텍스트
}

export interface WorshipAnnouncement {
  id: string | null;   // null = 아직 저장 안 된 기본 고정 버튼
  key: string | null;  // 'assembly'|'intercession'|'youth_ad'|'kakao' | null(특별 광고)
  kind: WorshipKind;
  title: string;
  icon: string;        // 이모지 또는 이미지 URL
  images: string[];    // 슬라이드 이미지(순서 있는 배열)
  content: WorshipContent;
  link: string;
  pinned: boolean;
  enabled: boolean;
  sortOrder: number;
  imageCount?: number; // 목록 응답에서 이미지 개수만 전달할 때 사용
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
