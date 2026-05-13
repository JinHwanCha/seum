import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });

  const supabase = createClient();

  // 모든 쿼리를 동시에 시작 — 4단계 워터폴 → 1단계 병렬
  const [prayersResult, orgResult, cellLeadersResult, bureauResult] = await Promise.all([
    supabase
      .from('prayer_requests')
      .select('*, user:users(id, name, role, minister_rank, village_id, cell_id)')
      .eq('department_id', session.departmentId)
      .eq('week_start', weekStart)
      .order('created_at', { ascending: true }),
    supabase
      .from('group_years')
      .select('id, villages(id, name, sort_order, cells(id, name, sort_order))')
      .eq('department_id', session.departmentId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('users')
      .select('id, name, cell_id')
      .eq('department_id', session.departmentId)
      .eq('role', 'cell_leader')
      .eq('is_graduated', false),
    (session.isBureauLeader || session.isBureauMember)
      ? supabase.from('bureau_members').select('user_id')
      : Promise.resolve({ data: null }),
  ]);

  const allPrayers = prayersResult.data;
  if (!allPrayers) return NextResponse.json({ prayers: [], myPrayer: null, villages: [], cells: [] });

  const groupYear = orgResult.data as any;
  const cellLeadersList = (cellLeadersResult.data || []) as any[];

  const cellLeadersMap: Record<string, { id: string; name: string }> = {};
  cellLeadersList.forEach((l: any) => {
    if (l.cell_id) cellLeadersMap[l.cell_id] = { id: l.id, name: l.name };
  });

  const rawVillages = ((groupYear?.villages || []) as any[])
    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

  const villages: { id: string; name: string; sort_order: number }[] = rawVillages.map((v: any) => ({
    id: v.id, name: v.name, sort_order: v.sort_order,
  }));

  const cells: { id: string; village_id: string; name: string | null; sort_order: number; leader?: { id: string; name: string } }[] =
    rawVillages.flatMap((v: any) =>
      ((v.cells || []) as any[])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((c: any) => ({
          id: c.id,
          village_id: v.id,
          name: c.name,
          sort_order: c.sort_order,
          leader: cellLeadersMap[c.id] || undefined,
        }))
    );

  // My prayer
  const myPrayer = allPrayers.find((p) => p.user_id === session.userId) || null;

  // Filter by visibility
  const visibleIds = new Set<string>();

  if (session.role === 'minister') {
    allPrayers.forEach((p) => visibleIds.add(p.user_id));
  } else {
    if (session.role === 'village_leader' || session.role === 'cell_leader') {
      allPrayers.forEach((p) => {
        if (p.user?.village_id === session.villageId) visibleIds.add(p.user_id);
      });
    }

    if (session.role === 'cell_member' || session.role === 'cell_leader') {
      allPrayers.forEach((p) => {
        if (p.user?.cell_id === session.cellId && session.cellId) visibleIds.add(p.user_id);
      });
    }

    if (session.isBureauLeader || session.isBureauMember) {
      const bureauUserIds = (bureauResult.data || []) as any[];
      bureauUserIds.forEach((b: any) => visibleIds.add(b.user_id));
      allPrayers.forEach((p) => {
        if (p.user?.role === 'minister') visibleIds.add(p.user_id);
      });
    }

    allPrayers.forEach((p) => {
      if (p.user?.minister_rank === 'pastor') visibleIds.add(p.user_id);
    });

    visibleIds.add(session.userId);
  }

  const prayers = allPrayers.filter((p) => visibleIds.has(p.user_id));

  return NextResponse.json({ prayers, myPrayer, villages, cells });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content, weekStart, targetUserId } = await request.json();
  if (!content || !weekStart) {
    return NextResponse.json({ error: 'content and weekStart required' }, { status: 400 });
  }

  const userId = targetUserId || session.userId;
  const supabase = createClient();

  // Check if already exists (upsert)
  const { data: existing } = await supabase
    .from('prayer_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('prayer_requests')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true, id: existing.id });
  }

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({
      user_id: userId,
      department_id: session.departmentId,
      week_start: weekStart,
      content,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
