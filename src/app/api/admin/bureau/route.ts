import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  const { data: bureauTypes } = await supabase
    .from('bureau_types')
    .select('*, members:bureau_members(*, user:users(id, name))')
    .eq('department_id', session.departmentId)
    .order('sort_order', { ascending: true });

  return NextResponse.json({ bureauTypes: bureauTypes || [] });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'minister') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { action, ...body } = await request.json();

  const supabase = createClient();

  if (action === 'addType') {
    const { name, slug } = body;
    const { data: maxSort } = await supabase
      .from('bureau_types')
      .select('sort_order')
      .eq('department_id', session.departmentId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase.from('bureau_types').insert({
      department_id: session.departmentId,
      name,
      slug,
      sort_order: (maxSort?.sort_order || 0) + 1,
    });

    if (error) return NextResponse.json({ error: '추가에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'addMember') {
    const { bureauTypeId, userId, isLeader } = body;
    const { error } = await supabase.from('bureau_members').insert({
      bureau_type_id: bureauTypeId,
      user_id: userId,
      is_leader: isLeader || false,
    });

    if (error) return NextResponse.json({ error: '추가에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'removeMember') {
    const { memberId } = body;
    const { error } = await supabase.from('bureau_members').delete().eq('id', memberId);
    if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
