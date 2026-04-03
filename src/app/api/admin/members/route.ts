import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canApproveMembers } from '@/lib/permissions';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const supabase = createClient();

  let query = supabase
    .from('users')
    .select('id, name, birth_date, phone, role, minister_rank, village_id, cell_id, is_approved, is_admin, is_graduated, graduated_at, created_at')
    .eq('department_id', session.departmentId)
    .order('created_at', { ascending: false });

  if (status === 'pending') {
    query = query.eq('is_approved', false).eq('role', 'pending');
  } else if (status === 'graduated') {
    query = query.eq('is_graduated', true);
  } else {
    query = query.eq('is_approved', true).eq('is_graduated', false);
  }

  const { data: members } = await query;
  return NextResponse.json({ members: members || [] });
}

// POST: 졸업 처리 (배치)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action, userIds } = await request.json();

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: '대상을 선택해주세요.' }, { status: 400 });
  }

  const supabase = createClient();

  if (action === 'graduate') {
    const { error } = await supabase
      .from('users')
      .update({
        is_graduated: true,
        graduated_at: new Date().toISOString(),
        village_id: null,
        cell_id: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', userIds)
      .eq('department_id', session.departmentId);

    if (error) return NextResponse.json({ error: '졸업 처리에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true, count: userIds.length });
  }

  if (action === 'restore') {
    const { error } = await supabase
      .from('users')
      .update({
        is_graduated: false,
        graduated_at: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', userIds)
      .eq('department_id', session.departmentId);

    if (error) return NextResponse.json({ error: '복원에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true, count: userIds.length });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
