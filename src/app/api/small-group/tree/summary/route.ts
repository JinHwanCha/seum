import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

const MAX_PER_WEEK = 1;

// 한 멤버의 한 주간 점수 (0..1)
// 베이스 70%: 예배/부서/소그룹, 보너스 30%: 기도/QT/통독
function weekScoreOf(att: any): number {
  if (!att) return 0;
  const base =
    ((att.worship_service ? 1 : 0) +
      (att.department_meeting ? 1 : 0) +
      (att.small_group ? 1 : 0)) /
    3;
  const bonus =
    (((att.prayer_count ?? 0) > 0 ? 1 : 0) +
      ((att.qt_count ?? 0) > 0 ? 1 : 0) +
      (att.bible_reading ? 1 : 0)) /
    3;
  return base * 0.7 + bonus * 0.3;
}

function sundaysOfMonth(year: number, month0: number): string[] {
  const result: string[] = [];
  const d = new Date(Date.UTC(year, month0, 1));
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCMonth() === month0) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    result.push(`${yyyy}-${mm}-${dd}`);
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return result;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthStart = searchParams.get('monthStart');
  const cellIdsParam = searchParams.get('cellIds');
  if (!monthStart || !cellIdsParam) {
    return NextResponse.json({ error: 'monthStart and cellIds required' }, { status: 400 });
  }
  const m = monthStart.match(/^(\d{4})-(\d{2})-01$/);
  if (!m) return NextResponse.json({ error: 'invalid monthStart' }, { status: 400 });
  const year = parseInt(m[1], 10);
  const month0 = parseInt(m[2], 10) - 1;

  const cellIds = cellIdsParam.split(',').filter(Boolean);
  if (cellIds.length === 0) return NextResponse.json({ summaries: [] });

  const supabase = createClient();

  // 모든 멤버 한번에
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, cell_id')
    .in('cell_id', cellIds)
    .eq('is_approved', true)
    .eq('is_graduated', false);
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });

  const userIds = (users || []).map((u) => u.id);
  const cellOf = new Map<string, string>();
  (users || []).forEach((u) => cellOf.set(u.id, u.cell_id));

  const startDate = `${m[1]}-${m[2]}-01`;
  const endDateObj = new Date(Date.UTC(year, month0 + 1, 0));
  const endDate = `${endDateObj.getUTCFullYear()}-${String(endDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(endDateObj.getUTCDate()).padStart(2, '0')}`;

  let attRows: any[] = [];
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('attendance')
      .select('user_id, week_start, worship_service, department_meeting, small_group, prayer_count, qt_count, bible_reading')
      .in('user_id', userIds)
      .gte('week_start', startDate)
      .lte('week_start', endDate);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    attRows = data || [];
  }

  const weekKeys = sundaysOfMonth(year, month0);

  // cellId -> { totalScore, totalMax }
  const cellAgg = new Map<string, { score: number; max: number; memberCount: number }>();
  cellIds.forEach((cid) => cellAgg.set(cid, { score: 0, max: 0, memberCount: 0 }));

  // 멤버 수 집계
  (users || []).forEach((u) => {
    const agg = cellAgg.get(u.cell_id);
    if (agg) agg.memberCount++;
  });

  // 점수 집계
  for (const u of users || []) {
    const cid = u.cell_id;
    const agg = cellAgg.get(cid);
    if (!agg) continue;
    for (const wk of weekKeys) {
      const att = attRows.find((a) => a.user_id === u.id && a.week_start === wk);
      agg.score += weekScoreOf(att);
      agg.max += MAX_PER_WEEK;
    }
  }

  const summaries = cellIds.map((cid) => {
    const agg = cellAgg.get(cid)!;
    const rate = agg.max > 0 ? agg.score / agg.max : 0;
    return {
      cellId: cid,
      monthScore: rate,
      memberCount: agg.memberCount,
      weekCount: weekKeys.length,
    };
  });

  return NextResponse.json({ summaries, weekKeys });
}
