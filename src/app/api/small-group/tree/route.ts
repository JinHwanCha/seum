import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// 한 멤버의 한 주간 점수 (0..1)
// 베이스 70%: 예배/부서/소그룹 (각 23.33%)
// 보너스 30%: 기도/QT/통독 (각 10%)
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

const MAX_PER_WEEK = 1;

// 해당 월(YYYY-MM)에 속하는 모든 일요일(주 시작) 목록 (YYYY-MM-DD)
function sundaysOfMonth(year: number, month0: number): string[] {
  const result: string[] = [];
  const d = new Date(Date.UTC(year, month0, 1));
  // 첫번째 일요일 찾기
  while (d.getUTCDay() !== 0) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
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
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cellId = searchParams.get('cellId');
  const monthStart = searchParams.get('monthStart'); // YYYY-MM-01

  if (!cellId || !monthStart) {
    return NextResponse.json({ error: 'cellId and monthStart required' }, { status: 400 });
  }

  const m = monthStart.match(/^(\d{4})-(\d{2})-01$/);
  if (!m) {
    return NextResponse.json({ error: 'invalid monthStart' }, { status: 400 });
  }
  const year = parseInt(m[1], 10);
  const month0 = parseInt(m[2], 10) - 1;

  const supabase = createClient();

  // 해당 셀의 멤버 목록
  const { data: members, error: memErr } = await supabase
    .from('users')
    .select('id, name')
    .eq('cell_id', cellId)
    .eq('is_approved', true)
    .eq('is_graduated', false);
  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }
  const memberList = members || [];
  const memberIds = memberList.map((u) => u.id);

  // 월 범위
  const startDate = `${m[1]}-${m[2]}-01`;
  const endDateObj = new Date(Date.UTC(year, month0 + 1, 0));
  const endDate = `${endDateObj.getUTCFullYear()}-${String(endDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(endDateObj.getUTCDate()).padStart(2, '0')}`;

  let attRows: any[] = [];
  if (memberIds.length > 0) {
    const { data, error } = await supabase
      .from('attendance')
      .select('user_id, week_start, worship_service, department_meeting, small_group, prayer_count, qt_count, bible_reading')
      .in('user_id', memberIds)
      .gte('week_start', startDate)
      .lte('week_start', endDate);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    attRows = data || [];
  }

  const weekKeys = sundaysOfMonth(year, month0);

  // 주차별 합계
  const weeks = weekKeys.map((wk, idx) => {
    let sumScore = 0;
    let presentCount = 0;
    for (const u of memberList) {
      const att = attRows.find((a) => a.user_id === u.id && a.week_start === wk);
      const s = weekScoreOf(att);
      sumScore += s;
      if (s > 0) presentCount++;
    }
    const totalMax = memberList.length * MAX_PER_WEEK;
    const rate = totalMax > 0 ? sumScore / totalMax : 0;
    return {
      weekStart: wk,
      weekIndex: idx, // 0-based
      presentCount,
      totalMembers: memberList.length,
      score: rate, // 0..1
    };
  });

  // 멤버별 월간 점수
  const memberScores = memberList.map((u) => {
    let total = 0;
    let attended = 0;
    for (const wk of weekKeys) {
      const att = attRows.find((a) => a.user_id === u.id && a.week_start === wk);
      const s = weekScoreOf(att);
      total += s;
      if (s > 0) attended++;
    }
    const totalMax = weekKeys.length * MAX_PER_WEEK;
    return {
      userId: u.id,
      name: u.name,
      monthScore: totalMax > 0 ? total / totalMax : 0,
      presentWeeks: attended,
      totalWeeks: weekKeys.length,
    };
  });

  // 월 전체 점수
  const totalMonthMax = memberList.length * weekKeys.length * MAX_PER_WEEK;
  const totalMonthScore = weeks.reduce((acc, w) => acc + w.score * memberList.length * MAX_PER_WEEK, 0);
  const monthScore = totalMonthMax > 0 ? totalMonthScore / totalMonthMax : 0;

  return NextResponse.json({
    weeks,
    weekKeys,
    memberScores,
    monthScore,
  });
}
