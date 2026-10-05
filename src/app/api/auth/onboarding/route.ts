import { NextResponse } from 'next/server';
import { createToken, getSession } from '@/lib/auth';
import { getVillagesWithCells } from '@/lib/admin-data';
import { COOKIE_NAME } from '@/lib/constants';
import { needsGroupSelection, validateGroupSelection } from '@/lib/group-selection';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.requiresGroupSelection) {
    return NextResponse.json(
      { error: '소속 변경은 마을장이나 사역자에게 문의해주세요.' },
      { status: 403 }
    );
  }
  if (!session.exp || session.exp <= Math.floor(Date.now() / 1000)) {
    return NextResponse.json({ error: '다시 로그인해주세요.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '올바른 선택 정보를 보내주세요.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !('villageId' in body) || !('cellId' in body)) {
    return NextResponse.json({ error: '마을과 소그룹을 선택해주세요.' }, { status: 400 });
  }

  try {
    const supabase = createClient();
    const { data: user, error: lookupError } = await supabase
      .from('users')
      .select('is_approved, requires_group_selection, village_id, cell_id')
      .eq('id', session.userId)
      .eq('church_id', session.churchId)
      .eq('department_id', session.departmentId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!user?.is_approved) {
      return NextResponse.json({ error: '승인된 회원만 선택할 수 있습니다.' }, { status: 403 });
    }

    let villageId: string | null = user.village_id;
    let cellId: string | null = user.cell_id;
    if (needsGroupSelection(user)) {
      const villages = await getVillagesWithCells(session);
      const validationError = validateGroupSelection(villages, body.villageId, body.cellId);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      if (typeof body.villageId !== 'string' || typeof body.cellId !== 'string') {
        return NextResponse.json({ error: '마을과 소그룹을 선택해주세요.' }, { status: 400 });
      }
      villageId = body.villageId;
      cellId = body.cellId;
      let update = supabase
        .from('users')
        .update({
          village_id: villageId,
          cell_id: cellId,
          requires_group_selection: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.userId)
        .eq('is_approved', true)
        .eq('requires_group_selection', true);
      update = user.village_id
        ? update.eq('village_id', user.village_id)
        : update.is('village_id', null);
      update = user.cell_id
        ? update.eq('cell_id', user.cell_id)
        : update.is('cell_id', null);
      const { data: saved, error: saveError } = await update.select('id').maybeSingle();
      if (saveError) throw saveError;
      if (!saved) {
        return NextResponse.json(
          { error: '소속 정보가 변경되었습니다. 다시 로그인한 뒤 확인해주세요.' },
          { status: 409 }
        );
      }
    }

    const token = await createToken({
      ...session,
      villageId,
      cellId,
      requiresGroupSelection: false,
    }, session.exp);
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: session.exp - Math.floor(Date.now() / 1000),
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Onboarding save failed:', error);
    return NextResponse.json(
      { error: '저장에 실패했습니다. 잠시 후 다시 시도해주세요. 계속 실패하면 마을장이나 사역자에게 문의해주세요.' },
      { status: 500 }
    );
  }
}
