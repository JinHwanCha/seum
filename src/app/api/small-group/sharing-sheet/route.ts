import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// 목장 나눔지 구글 시트 (CSV 공개). 환경변수로 부서별 오버라이드 가능.
const SHEET_ID =
  process.env.SHARING_SHEET_ID || '103zpvnwBbgXOTt5hrWQxG5Duxw34hRphmHu3pMwtCZc';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;

// 헤더/구분 행 (실제 내용이 아님)
const HEADER_LABELS = new Set(['나눔지 상단 제목', '분류']);

interface SharingSection {
  label: string;
  items: string[];
}

interface SharingSheetData {
  title: string;
  scripture: string;
  preacher: string;
  sections: SharingSection[];
}

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

function buildSheetData(csv: string): SharingSheetData {
  const rows = parseCsv(csv);
  let title = '';
  let scripture = '';
  let preacher = '';
  const sections: SharingSection[] = [];
  const sectionMap = new Map<string, SharingSection>();

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
      section = { label, items: [] };
      sectionMap.set(label, section);
      sections.push(section);
    }
    if (value) section.items.push(value);
  }

  return { title, scripture, preacher, sections };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  const [deptResult, churchResult, sheetResponse] = await Promise.all([
    supabase.from('departments').select('name, slug').eq('id', session.departmentId).single(),
    supabase.from('churches').select('name').eq('id', session.churchId).single(),
    fetch(SHEET_CSV_URL, {
      // 5분 캐시 — 시트 변경이 너무 잦지 않으므로 부하 최소화
      next: { revalidate: 300 },
    }),
  ]);

  const departmentName = deptResult.data?.name || '';
  const departmentSlug = deptResult.data?.slug || session.departmentSlug || '';
  const churchName = churchResult.data?.name || '';

  let sheet: SharingSheetData = {
    title: '',
    scripture: '',
    preacher: '',
    sections: [],
  };

  if (sheetResponse.ok) {
    const csv = await sheetResponse.text();
    sheet = buildSheetData(csv);
  }

  return NextResponse.json({
    churchName,
    departmentName,
    departmentSlug,
    ...sheet,
  });
}
