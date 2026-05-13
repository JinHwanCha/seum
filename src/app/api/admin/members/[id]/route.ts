import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canApproveMembers, canModifyUserRole, canVillageLeaderAssignRole } from '@/lib/permissions';
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
    if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
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
    if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
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

    // 마을장 권한 가드 — 본인보다 동급/상위 역할 부여·박탈 차단
    if (session.role === 'village_leader' && !session.isAdmin) {
      if (!canVillageLeaderAssignRole(role as Role, target.role as Role)) {
        return NextResponse.json(
          { error: '마을장은 목자/목원까지만 배정할 수 있습니다.' },
          { status: 403 }
        );
      }
    }

    // Permission check for role changes
    if (role !== target.role || ministerRank !== target.minister_rank) {
      if (role === 'minister' || target.role === 'minister') {
        // Changing to/from minister requires proper hierarchy
        if (!canModifyUserRole(
          session.role as Role,
          session.ministerRank as MinisterRank | null,
          target.role as Role,
          target.minister_rank as MinisterRank | null,
          session.isAdmin
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 사역자 또는 시스템 관리자만 회원 삭제 가능
  if (session.role !== 'minister' && !session.isAdmin) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  // 본인 계정은 삭제 차단
  if (params.id === session.userId) {
    return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다.' }, { status: 400 });
  }

  const supabase = createClient();

  // 다른 부서 회원 보호 — 같은 부서만
  const { data: target } = await supabase
    .from('users')
    .select('department_id, role, minister_rank')
    .eq('id', params.id)
    .single();

  if (!target) return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
  if (target.department_id !== session.departmentId) {
    return NextResponse.json({ error: '같은 부서 회원만 삭제할 수 있습니다.' }, { status: 403 });
  }

  // 사역자 삭제는 동등하거나 더 높은 권한자만
  if (target.role === 'minister') {
    if (
      !canModifyUserRole(
        session.role as Role,
        session.ministerRank as MinisterRank | null,
        target.role as Role,
        target.minister_rank as MinisterRank | null,
        session.isAdmin
      )
    ) {
      return NextResponse.json({ error: '이 사역자를 삭제할 권한이 없습니다.' }, { status: 403 });
    }
  }

  const { error } = await supabase.from('users').delete().eq('id', params.id);
  if (error) {
    console.error('Member delete error:', error);
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
