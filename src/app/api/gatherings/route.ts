import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canManageGatherings } from '@/lib/permissions';
import { normalizeGatheringInput } from '@/lib/gathering';
import { loadGatherings, rowToGathering } from '@/lib/dashboard-data';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await loadGatherings(session);
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (
    !canManageGatherings(
      session.role as any,
      session.isBureauLeader || session.isBureauMember,
      session.isAdmin
    )
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const input = normalizeGatheringInput(await request.json().catch(() => null));
  if (!input.name) {
    return NextResponse.json({ error: '모임 이름을 입력해주세요.' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: maxSort } = await supabase
    .from('gatherings')
    .select('sort_order')
    .eq('department_id', session.departmentId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('gatherings')
    .insert({
      department_id: session.departmentId,
      ...input,
      sort_order: (maxSort?.sort_order ?? 0) + 1,
      created_by: session.userId,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { error: `모임 추가에 실패했습니다. (${error.message})` },
      { status: 500 }
    );
  }

  return NextResponse.json({ gathering: rowToGathering(data as Record<string, unknown>) });
}
