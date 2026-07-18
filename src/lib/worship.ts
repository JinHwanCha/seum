import type {
  WorshipAnnouncement,
  WorshipContent,
  WorshipKind,
  WorshipSection,
  WorshipTimetableRow,
} from '@/lib/types';

// 카카오 채널 기본 URL (변경 가능)
export const DEFAULT_KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_xibZxhC';

// 부서 캘린더 기본 URL (구글 캘린더 embed, 사역자/국장단/관리자가 언제든 교체 가능)
export const DEFAULT_CALENDAR_URL =
  'https://calendar.google.com/calendar/embed?src=1cc384df8081335a97628b2d6e4170a84430dae267b3fd579e418ffdee35ffad%40group.calendar.google.com&ctz=Asia%2FSeoul';

export interface WorshipFixedDef {
  key: string;
  kind: WorshipKind;
  label: string;   // 버튼에 표시되는 고정 라벨
  icon: string;    // 기본 이모지
  color: string;   // 아이콘 박스 색상 (tailwind)
  order: number;   // 고정 버튼 표시 순서
}

// 고정 버튼 정의 (순서대로)
export const WORSHIP_FIXED_DEFS: WorshipFixedDef[] = [
  { key: 'assembly',     kind: 'timetable', label: '집회 안내',   icon: '📋', color: 'bg-rose-50 text-rose-600',     order: 1 },
  { key: 'intercession', kind: 'prayer',    label: '중보기도회',  icon: '🙏', color: 'bg-indigo-50 text-indigo-600', order: 2 },
  { key: 'youth_ad',     kind: 'slideshow', label: '청년부 광고', icon: '📢', color: 'bg-sky-50 text-sky-600',       order: 3 },
  { key: 'calendar',     kind: 'calendar',  label: '어부들 캘린더', icon: '📅', color: 'bg-emerald-50 text-emerald-600', order: 4 },
  { key: 'kakao',        kind: 'link',      label: '카카오 채널', icon: '💬', color: 'bg-yellow-50 text-yellow-600', order: 5 },
];

export const WORSHIP_FIXED_MAP: Record<string, WorshipFixedDef> = Object.fromEntries(
  WORSHIP_FIXED_DEFS.map((d) => [d.key, d])
);

const VALID_KINDS: WorshipKind[] = ['timetable', 'prayer', 'slideshow', 'link', 'calendar'];

function str(v: unknown): string {
  return String(v ?? '').trim();
}

/** kind별 content(JSONB)를 안전하게 정규화한다. */
export function normalizeWorshipContent(raw: unknown): WorshipContent {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const rows: WorshipTimetableRow[] = Array.isArray(obj.rows)
    ? obj.rows.map((r) => {
        const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
        return {
          duration: str(row.duration),
          program: str(row.program),
          detail: String(row.detail ?? ''),
          leader: str(row.leader),
          remark: String(row.remark ?? ''),
        };
      })
    : [];

  const sections: WorshipSection[] = Array.isArray(obj.sections)
    ? obj.sections
        .map((s) => {
          const sec = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
          const items = Array.isArray(sec.items)
            ? sec.items.map((i) => String(i ?? '')).filter((i) => i.trim() !== '')
            : [];
          return { title: str(sec.title), items };
        })
        .filter((s) => s.title !== '' || s.items.length > 0)
    : [];

  return {
    subtitle: str(obj.subtitle),
    note: str(obj.note),
    rows,
    sections,
  };
}

/** 이미지 배열(data URL 문자열)을 정규화한다. */
export function normalizeImages(raw: unknown, max = 30): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((i) => String(i ?? ''))
    .filter((s) => s.trim() !== '')
    .slice(0, max);
}

/** 요청 본문을 DB 컬럼(snake_case) 형태로 정규화 */
export function normalizeWorshipInput(body: unknown) {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const kind = VALID_KINDS.includes(b.kind as WorshipKind) ? (b.kind as WorshipKind) : 'slideshow';
  return {
    kind,
    title: str(b.title),
    icon: str(b.icon),
    images: normalizeImages(b.images),
    content: normalizeWorshipContent(b.content),
    link: str(b.link),
    pinned: Boolean(b.pinned),
    enabled: b.enabled === undefined ? true : Boolean(b.enabled),
  };
}

/** DB 로우(snake_case) → WorshipAnnouncement 변환 */
export function rowToWorship(row: Record<string, unknown>): WorshipAnnouncement {
  const key = row.key === null || row.key === undefined ? null : String(row.key);
  const fixed = key ? WORSHIP_FIXED_MAP[key] : undefined;
  return {
    id: row.id ? String(row.id) : null,
    key,
    kind: (VALID_KINDS.includes(row.kind as WorshipKind) ? row.kind : fixed?.kind ?? 'slideshow') as WorshipKind,
    title: String(row.title ?? ''),
    icon: String(row.icon ?? ''),
    images: normalizeImages(row.images),
    content: normalizeWorshipContent(row.content),
    link: String(row.link ?? ''),
    pinned: Boolean(row.pinned),
    enabled: row.enabled === undefined ? true : Boolean(row.enabled),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

/** DB에 행이 아직 없는 고정 버튼의 기본값을 만든다. */
export function defaultFixedWorship(def: WorshipFixedDef): WorshipAnnouncement {
  return {
    id: null,
    key: def.key,
    kind: def.kind,
    title: def.label,
    icon: def.icon,
    images: [],
    content: {},
    link:
      def.key === 'kakao'
        ? DEFAULT_KAKAO_CHANNEL_URL
        : def.key === 'calendar'
        ? DEFAULT_CALENDAR_URL
        : '',
    pinned: false,
    enabled: true,
    sortOrder: def.order,
  };
}
