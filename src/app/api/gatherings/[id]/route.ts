import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canManageGatherings } from '@/lib/permissions';
import { normalizeGatheringInput } from '@/lib/gathering';

function ensurePermission(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return 'unauthorized' as const;
  if (
    !canManageGatherings(
      session.role as any,
      session.isBureauLeader || session.isBureauMember,
      session.isAdmin
    )
  ) {
    return 'forbidden' as const;
  }
  return 'ok' as const;
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const check = ensurePermission(session);
  if (check === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (check === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const input = normalizeGatheringInput(await request.json().catch(() => null));
  if (!input.name) {
    return NextResponse.json({ error: '모임 이름을 입력해주세요.' }, { status: 400 });
  }

  const supabase = createClient();

  const { error } = await supabase
    .from('gatherings')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('department_id', session!.departmentId);

  if (error) {
    return NextResponse.json({ error: '모임 수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const check = ensurePermission(session);
  if (check === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (check === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createClient();

  const { error } = await supabase
    .from('gatherings')
    .delete()
    .eq('id', params.id)
    .eq('department_id', session!.departmentId);

  if (error) {
    return NextResponse.json({ error: '모임 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
