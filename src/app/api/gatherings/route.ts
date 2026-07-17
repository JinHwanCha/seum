import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { GATHERING_SHEET_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase';
import { canManageGatherings } from '@/lib/permissions';
import { normalizeGatheringInput } from '@/lib/gathering';
import type { GatheringItem } from '@/lib/types';

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
function rowToItem(row: Record<string, unknown>): GatheringItem {
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

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  // 테이블이 아직 없거나 오류가 나도 시트 목록은 유지한다.
  const dbItems = Array.isArray(dbResult.data)
    ? dbResult.data.map((r) => rowToItem(r as Record<string, unknown>))
    : [];

  // 직접 등록한 모임을 먼저, 그 다음 구글시트 모임을 보여준다.
  const gatherings = [...dbItems, ...sheetItems];

  const canManage = canManageGatherings(
    session.role as any,
    session.isBureauLeader || session.isBureauMember,
    session.isAdmin
  );

  return NextResponse.json({ gatherings, canManage });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (
    !canManageGatherings(
      session.role as any,
      session.isBureauLeader || session.isBureauMember,
      session.isAdmin
    )
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const input = normalizeGatheringInput(await request.json().catch(() => null));
  if (!input.name) {
    return NextResponse.json({ error: '모임 이름을 입력해주세요.' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: maxSort } = await supabase
    .from('gatherings')
    .select('sort_order')
    .eq('department_id', session.departmentId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('gatherings')
    .insert({
      department_id: session.departmentId,
      ...input,
      sort_order: (maxSort?.sort_order ?? 0) + 1,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: '모임 추가에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ gathering: rowToItem(data as Record<string, unknown>) });
}
