import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

// GET /api/small-group/monthly?month=YYYY-MM
// 마을 종합 기도제목(월별): 감독권한/마을 범위에 따라 가시성을 적용해
// 해당 월의 기도제목을 반환한다. (주별 여러 건)
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month (YYYY-MM) required' }, { status: 400 });
  }

  const supabase = createClient();

  // JWT는 stale할 수 있으므로 최신 role/cell/village를 DB에서 조회
  const { data: freshUser } = await supabase
    .from('users')
    .select('role, cell_id, village_id')
    .eq('id', session.userId)
    .single();

  const role = (freshUser?.role as string) ?? session.role;
  const cellId = freshUser?.cell_id ?? session.cellId ?? null;
  const villageId = freshUser?.village_id ?? session.villageId ?? null;

  // 월 범위 [YYYY-MM-01, 다음달-01)
  const [y, m] = month.split('-').map(Number);
  const monthStart = `${month}-01`;
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;

  const { data: allPrayers } = await supabase
    .from('prayer_requests')
    .select('user_id, week_start, content, images, is_cell_only, user:users(id, role, cell_id, village_id)')
    .eq('department_id', session.departmentId)
    .gte('week_start', monthStart)
    .lt('week_start', nextMonth)
    .order('week_start', { ascending: true });

  const rows = (allPrayers || []) as any[];

  let visible: any[] = [];
  if (role === 'minister') {
    visible = rows;
  } else if (role === 'village_leader') {
    visible = rows.filter((p) => p.user?.village_id === villageId);
  } else if (role === 'cell_leader' || role === 'cell_member') {
    // 자기 마을 열람, 단 다른 셀의 "소그룹에만 공개" 글은 제외
    visible = rows.filter((p) => {
      if (p.user?.village_id !== villageId) return false;
      if (p.is_cell_only && p.user?.cell_id !== cellId) return false;
      return true;
    });
  }

  const prayers = visible.map((p) => ({
    user_id: p.user_id,
    week_start: p.week_start,
    content: p.content,
    images: p.images,
    is_cell_only: p.is_cell_only,
  }));

  return NextResponse.json({ prayers });
}
