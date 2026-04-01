import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canApproveMembers, canModifyUserRole } from '@/lib/permissions';
import type { Role, MinisterRank } from '@/lib/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;
  const supabase = createClient();

  if (action === 'approve') {
    if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('users')
      .update({ is_approved: true, role: 'cell_member', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: '승인에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'reject') {
    if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('users').delete().eq('id', params.id);
    if (error) return NextResponse.json({ error: '거절에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'update') {
    const { role, ministerRank, villageId, cellId } = body;

    // Get target user
    const { data: target } = await supabase
      .from('users')
      .select('role, minister_rank')
      .eq('id', params.id)
      .single();

    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Permission check for role changes
    if (role !== target.role || ministerRank !== target.minister_rank) {
      if (role === 'minister' || target.role === 'minister') {
        // Changing to/from minister requires proper hierarchy
        if (!canModifyUserRole(
          session.role as Role,
          session.ministerRank as MinisterRank | null,
          target.role as Role,
          target.minister_rank as MinisterRank | null
        )) {
          return NextResponse.json({ error: '이 사용자의 역할을 변경할 권한이 없습니다.' }, { status: 403 });
        }
      }
    }

    const updateData: any = {
      role,
      minister_rank: role === 'minister' ? ministerRank : null,
      village_id: villageId || null,
      cell_id: cellId || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('users').update(updateData).eq('id', params.id);
    if (error) return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
