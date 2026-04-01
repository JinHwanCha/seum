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

  // Fetch all prayer requests for this department/week
  const { data: allPrayers } = await supabase
    .from('prayer_requests')
    .select('*, user:users(id, name, role, minister_rank, village_id, cell_id)')
    .eq('department_id', session.departmentId)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true });

  if (!allPrayers) return NextResponse.json({ prayers: [], myPrayer: null });

  // My prayer
  const myPrayer = allPrayers.find((p) => p.user_id === session.userId) || null;

  // Filter by visibility
  const visibleIds = new Set<string>();

  if (session.role === 'minister') {
    // See all
    allPrayers.forEach((p) => visibleIds.add(p.user_id));
  } else {
    // Village leader / cell leader: see own village
    if (session.role === 'village_leader' || session.role === 'cell_leader') {
      allPrayers.forEach((p) => {
        if (p.user?.village_id === session.villageId) visibleIds.add(p.user_id);
      });
    }

    // Cell member: see own cell
    if (session.role === 'cell_member' || session.role === 'cell_leader') {
      allPrayers.forEach((p) => {
        if (p.user?.cell_id === session.cellId && session.cellId) visibleIds.add(p.user_id);
      });
    }

    // Bureau: see bureau + minister
    if (session.isBureauLeader || session.isBureauMember) {
      const { data: bureauUserIds } = await supabase
        .from('bureau_members')
        .select('user_id');
      bureauUserIds?.forEach((b) => visibleIds.add(b.user_id));
      allPrayers.forEach((p) => {
        if (p.user?.role === 'minister') visibleIds.add(p.user_id);
      });
    }

    // Pastor's prayers are always visible
    allPrayers.forEach((p) => {
      if (p.user?.minister_rank === 'pastor') visibleIds.add(p.user_id);
    });

    // Always see own
    visibleIds.add(session.userId);
  }

  const prayers = allPrayers.filter((p) => visibleIds.has(p.user_id));

  return NextResponse.json({ prayers, myPrayer });
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
