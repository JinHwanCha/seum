import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// GET /api/prayer-requests/monthly?month=YYYY-MM
// 로그인 사용자의 소그룹(셀) 구성원의 해당 월 기도제목을 반환한다.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month (YYYY-MM) required' }, { status: 400 });
  }

  const supabase = createClient();

  // JWT는 stale할 수 있으므로 최신 cell을 DB에서 조회
  const { data: freshUser } = await supabase
    .from('users')
    .select('cell_id')
    .eq('id', session.userId)
    .single();

  const cellId = freshUser?.cell_id ?? session.cellId ?? null;
  if (!cellId) {
    return NextResponse.json({ members: [], prayers: [] });
  }

  // 월 범위 [YYYY-MM-01, 다음달-01)
  const [y, m] = month.split('-').map(Number);
  const monthStart = `${month}-01`;
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;

  const [membersResult, prayersResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, role, birth_date')
      .eq('cell_id', cellId)
      .eq('is_approved', true)
      .eq('is_graduated', false)
      .order('role', { ascending: true }),
    supabase
      .from('prayer_requests')
      .select('id, user_id, week_start, content, images, is_cell_only')
      .eq('department_id', session.departmentId)
      .gte('week_start', monthStart)
      .lt('week_start', nextMonth)
      .order('week_start', { ascending: true }),
  ]);

  const members = (membersResult.data || []) as any[];
  const memberIdSet = new Set(members.map((m: any) => m.id));
  const prayers = (prayersResult.data || []).filter((p: any) => memberIdSet.has(p.user_id));

  return NextResponse.json({ members, prayers });
}
