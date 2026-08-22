// 서버 전용 대시보드 데이터 로더.
// 모임 게시판/예배 안내의 데이터 조회 로직을 한곳에 모아
//   1) 해당 API 라우트(GET)
//   2) 대시보드 서버 컴포넌트(SWR fallback 프리로드)
// 양쪽에서 재사용한다. SUPABASE_SERVICE_ROLE_KEY 를 쓰는 createClient 를
// import 하므로 절대 클라이언트 컴포넌트에서 import 하면 안 된다(서버 전용).
import { createClient } from './supabase';
import { GATHERING_SHEET_ID } from './constants';
import { canManageGatherings, canManageWorship } from './permissions';
import {
  WORSHIP_FIXED_DEFS,
  defaultFixedWorship,
  rowToWorship,
} from './worship';
import type { GatheringItem, SessionPayload, WorshipAnnouncement } from './types';

// ─── 모임 게시판 ────────────────────────────────────────────

const sheetCsvUrl = (sheetId: string) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=0`;

/** 따옴표/이스케이프를 처리하는 최소 CSV 파서 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // CRLF 의 CR 무시
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// 시트 컬럼 순서
// 0: 모임 이름 | 1: 모임 링크 | 2: 이미지 url | 3: 모임 종류 | 4: 모임장
// 5: 카톡 ID | 6: 모임 이미지 | 7: 모임 내용 | 8: 버튼 이름 | 9: 모임 신청 마감
function buildGatherings(csv: string): GatheringItem[] {
  const rows = parseCsv(csv);
  const items: GatheringItem[] = [];

  // 첫 행(헤더)은 건너뛴다.
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[0] || '').trim();
    if (!name) continue; // 빈 행 제외

    items.push({
      id: String(i),
      source: 'sheet',
      name,
      link: (r[1] || '').trim(),
      imageUrl: (r[2] || '').trim(),
      type: (r[3] || '').trim(),
      leader: (r[4] || '').trim(),
      kakaoId: (r[5] || '').trim(),
      bannerUrl: (r[6] || '').trim(),
      images: [],
      content: r[7] || '',
      buttonLabel: (r[8] || '').trim(),
      disabled: (r[9] || '').trim().toLowerCase() === 'disabled',
    });
  }

  return items;
}

/** DB 로우(snake_case) → GatheringItem 변환 */
export function rowToGathering(row: Record<string, unknown>): GatheringItem {
  return {
    id: String(row.id),
    source: 'db',
    name: String(row.name ?? ''),
    link: String(row.link ?? ''),
    imageUrl: String(row.image_url ?? ''),
    type: String(row.type ?? ''),
    leader: String(row.leader ?? ''),
    kakaoId: String(row.kakao_id ?? ''),
    bannerUrl: String(row.banner_url ?? ''),
    images: Array.isArray(row.images) ? (row.images as unknown[]).map((i) => String(i ?? '')) : [],
    content: String(row.content ?? ''),
    buttonLabel: String(row.button_label ?? ''),
    disabled: Boolean(row.disabled),
  };
}

export interface GatheringsPayload {
  gatherings: GatheringItem[];
  canManage: boolean;
}

export async function loadGatherings(session: SessionPayload): Promise<GatheringsPayload> {
  const supabase = createClient();

  // 구글시트 CSV 와 DB 모임을 동시에 가져온다.
  const [sheetResult, dbResult] = await Promise.all([
    fetch(sheetCsvUrl(GATHERING_SHEET_ID), { next: { revalidate: 300 } })
      .then((res) => (res.ok ? res.text() : ''))
      .catch(() => ''),
    supabase
      .from('gatherings')
      .select('*')
      .eq('department_id', session.departmentId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  const sheetItems = sheetResult ? buildGatherings(sheetResult) : [];
  const dbItems = Array.isArray(dbResult.data)
    ? dbResult.data.map((r) => rowToGathering(r as Record<string, unknown>))
    : [];

  // 직접 등록한 모임을 먼저, 그 다음 구글시트 모임을 보여준다.
  const gatherings = [...dbItems, ...sheetItems];

  const canManage = canManageGatherings(
    session.role as any,
    session.isBureauLeader || session.isBureauMember,
    session.isAdmin
  );

  return { gatherings, canManage };
}

// ─── 예배 안내 ──────────────────────────────────────────────

export interface WorshipPayload {
  items: WorshipAnnouncement[];
  canManage: boolean;
}

export async function loadWorshipItems(session: SessionPayload): Promise<WorshipPayload> {
  const supabase = createClient();
  // 목록에서는 무거운 images(JSONB)를 제외하고 개수(image_count)만 조회한다.
  const { data } = await supabase
    .from('worship_announcements')
    .select('id, department_id, key, kind, title, icon, content, link, pinned, enabled, sort_order, image_count')
    .eq('department_id', session.departmentId);

  const rows = (data || []) as Record<string, unknown>[];
  const byKey = new Map<string, Record<string, unknown>>();
  rows.forEach((r) => {
    if (r.key) byKey.set(String(r.key), r);
  });

  const fixedItems = WORSHIP_FIXED_DEFS.map((def) => {
    const row = byKey.get(def.key);
    return row ? rowToWorship(row) : defaultFixedWorship(def);
  });

  const specialItems = rows
    .filter((r) => !r.key)
    .map((r) => rowToWorship(r))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.sortOrder - b.sortOrder);

  // 특별 광고를 앞에, 그 다음 고정 버튼. 이미지는 목록에서 제외(용량 최소화).
  // imageCount 는 rowToWorship 에서 image_count 컬럼으로 이미 채워진다.
  const items = [...specialItems, ...fixedItems].map((it) => ({ ...it, images: [] }));

  const canManage = canManageWorship(
    session.role as any,
    session.isBureauLeader || session.isBureauMember,
    session.isAdmin
  );

  return { items, canManage };
}
