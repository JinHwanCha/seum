import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { GATHERING_SHEET_ID } from '@/lib/constants';
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
      name,
      link: (r[1] || '').trim(),
      imageUrl: (r[2] || '').trim(),
      type: (r[3] || '').trim(),
      leader: (r[4] || '').trim(),
      kakaoId: (r[5] || '').trim(),
      bannerUrl: (r[6] || '').trim(),
      content: r[7] || '',
      buttonLabel: (r[8] || '').trim(),
      disabled: (r[9] || '').trim().toLowerCase() === 'disabled',
    });
  }

  return items;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let gatherings: GatheringItem[] = [];
  try {
    const res = await fetch(sheetCsvUrl(GATHERING_SHEET_ID), {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      gatherings = buildGatherings(await res.text());
    }
  } catch {
    gatherings = [];
  }

  return NextResponse.json({ gatherings });
}
