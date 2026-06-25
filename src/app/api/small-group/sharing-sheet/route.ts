import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import type {
  SharingSheetContent,
  SharingSheetSection,
  SharingSheetSource,
  SharingSectionStyle,
} from '@/lib/types';

// 목장 나눔지 기본 구글 시트 (CSV 공개). 환경변수로 오버라이드 가능.
const DEFAULT_SHEET_ID =
  process.env.SHARING_SHEET_ID || '103zpvnwBbgXOTt5hrWQxG5Duxw34hRphmHu3pMwtCZc';
const sheetCsvUrl = (sheetId: string) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=0`;

// 헤더/구분 행 (실제 내용이 아님)
const HEADER_LABELS = new Set(['나눔지 상단 제목', '분류']);

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

function buildSheetContent(csv: string): SharingSheetContent {
  const rows = parseCsv(csv);
  let title = '';
  let scripture = '';
  let preacher = '';
  const sections: SharingSheetSection[] = [];
  const sectionMap = new Map<string, SharingSheetSection>();

  for (const r of rows) {
    const label = (r[0] || '').trim();
    const value = (r[1] || '').trim();
    if (!label || HEADER_LABELS.has(label)) continue;

    if (label === '주일예배 제목') {
      title = value;
      continue;
    }
    if (label === '주일예배 말씀') {
      scripture = value;
      continue;
    }
    if (label === '설교자') {
      preacher = value;
      continue;
    }

    // 그 외 라벨(본문 질문 / 적용 질문 / 후속 나눔 등)은 라벨별로 묶는다.
    let section = sectionMap.get(label);
    if (!section) {
      section = {
        label,
        style: label.includes('질문') ? 'numbered' : 'bullet',
        items: [],
      };
      sectionMap.set(label, section);
      sections.push(section);
    }
    if (value) section.items.push(value);
  }

  return { title, subtitle: '', scripture, scriptureBody: '', preacher, sections };
}

/** 저장/표시에 안전한 형태로 정규화 */
function normalizeContent(raw: unknown): SharingSheetContent {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
  const sections: SharingSheetSection[] = rawSections
    .map((s) => {
      const sec = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
      const style: SharingSectionStyle = sec.style === 'numbered' ? 'numbered' : 'bullet';
      const items = Array.isArray(sec.items)
        ? sec.items.map((i) => String(i ?? '')).filter((i) => i.trim() !== '')
        : [];
      return { label: String(sec.label ?? '').trim(), style, items };
    })
    .filter((s) => s.label !== '' || s.items.length > 0);

  return {
    title: String(obj.title ?? '').trim(),
    subtitle: String(obj.subtitle ?? '').trim(),
    scripture: String(obj.scripture ?? '').trim(),
    scriptureBody: String(obj.scriptureBody ?? ''),
    preacher: String(obj.preacher ?? '').trim(),
    sections,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  const [deptResult, churchResult, sheetRowResult] = await Promise.all([
    supabase.from('departments').select('name, slug').eq('id', session.departmentId).single(),
    supabase.from('churches').select('name').eq('id', session.churchId).single(),
    supabase
      .from('sharing_sheets')
      .select('source, google_sheet_id, content')
      .eq('department_id', session.departmentId)
      .maybeSingle(),
  ]);

  const departmentName = deptResult.data?.name || '';
  const departmentSlug = deptResult.data?.slug || session.departmentSlug || '';
  const churchName = churchResult.data?.name || '';

  const row = sheetRowResult.data as
    | { source: string; google_sheet_id: string | null; content: unknown }
    | null;
  const source: SharingSheetSource = row?.source === 'manual' ? 'manual' : 'google_sheet';

  let content: SharingSheetContent;
  if (source === 'manual') {
    content = normalizeContent(row?.content);
  } else {
    const sheetId = row?.google_sheet_id || DEFAULT_SHEET_ID;
    try {
      const res = await fetch(sheetCsvUrl(sheetId), { next: { revalidate: 300 } });
      content = res.ok ? buildSheetContent(await res.text()) : normalizeContent(null);
    } catch {
      content = normalizeContent(null);
    }
  }

  return NextResponse.json({
    churchName,
    departmentName,
    departmentSlug,
    source,
    googleSheetId: row?.google_sheet_id || '',
    canEdit: session.role === 'minister',
    content,
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'minister') {
    return NextResponse.json({ error: '사역자만 수정할 수 있습니다.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const source: SharingSheetSource = body.source === 'manual' ? 'manual' : 'google_sheet';
  const content = normalizeContent(body.content);
  const googleSheetId =
    typeof body.googleSheetId === 'string' ? body.googleSheetId.trim() : '';

  const supabase = createClient();
  const { error } = await supabase.from('sharing_sheets').upsert(
    {
      department_id: session.departmentId,
      source,
      google_sheet_id: googleSheetId || null,
      content,
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'department_id' }
  );

  if (error) {
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, source, content });
}
