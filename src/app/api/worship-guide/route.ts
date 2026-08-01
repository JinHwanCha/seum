import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canManageWorship } from '@/lib/permissions';
import {
  WORSHIP_FIXED_MAP,
  normalizeWorshipInput,
} from '@/lib/worship';
import { loadWorshipItems } from '@/lib/dashboard-data';
import type { SessionPayload } from '@/lib/types';

function mayManage(session: SessionPayload): boolean {
  return canManageWorship(
    session.role as any,
    session.isBureauLeader || session.isBureauMember,
    session.isAdmin
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await loadWorshipItems(session);
  return NextResponse.json(payload);
}

// 특별 광고 생성
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!mayManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const input = normalizeWorshipInput(await request.json().catch(() => null));
  if (!input.title) {
    return NextResponse.json({ error: '광고 제목을 입력해주세요.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: maxSort } = await supabase
    .from('worship_announcements')
    .select('sort_order')
    .eq('department_id', session.departmentId)
    .is('key', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('worship_announcements')
    .insert({
      department_id: session.departmentId,
      key: null,
      ...input,
      sort_order: (maxSort?.sort_order ?? 0) + 1,
      created_by: session.userId,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: '광고 추가에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

// 고정 버튼(key) 저장 (없으면 생성, 있으면 수정)
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!mayManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const key = body && typeof body.key === 'string' ? body.key : '';
  const def = WORSHIP_FIXED_MAP[key];
  if (!def) {
    return NextResponse.json({ error: '알 수 없는 버튼입니다.' }, { status: 400 });
  }

  // kind는 고정 정의를 강제한다.
  const input = normalizeWorshipInput({ ...(body || {}), kind: def.kind });

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('worship_announcements')
    .select('id')
    .eq('department_id', session.departmentId)
    .eq('key', key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('worship_announcements')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  } else {
    const { error } = await supabase.from('worship_announcements').insert({
      department_id: session.departmentId,
      key,
      ...input,
      sort_order: def.order,
      created_by: session.userId,
    });
    if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
