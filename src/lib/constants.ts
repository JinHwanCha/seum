export const COOKIE_NAME = 'seum-token';

export const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'seum-dev-secret-key-change-in-production-32ch'
);

export const ROLE_HIERARCHY: Record<string, number> = {
  pending: 0,
  cell_member: 1,
  cell_leader: 2,
  village_leader: 3,
  minister: 4,
};

export const MINISTER_HIERARCHY: Record<string, number> = {
  secretary: 1,
  evangelist: 2,
  associate_pastor: 3,
  pastor: 4,
};

export const BOARD_TYPE_LABELS: Record<string, string> = {
  notice: '공지',
  sharing: '나눔',
  gathering: '모임',
  intercession: '중보기도',
};

export const ROLE_LABELS_DEFAULT: Record<string, string> = {
  minister: '사역자',
  village_leader: '마을장',
  cell_leader: '목자',
  cell_member: '목원',
  pending: '대기',
};

export const MINISTER_RANK_LABELS: Record<string, string> = {
  pastor: '목사',
  associate_pastor: '강도사',
  evangelist: '전도사',
  secretary: '간사',
};

export const EMOJIS = ['🙏', '❤️', '👍', '🔥', '💪', '😊', '🎉', '✝️'];
