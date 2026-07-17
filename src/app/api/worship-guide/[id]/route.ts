import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canManageWorship } from '@/lib/permissions';
import { normalizeWorshipInput, rowToWorship } from '@/lib/worship';
import type { SessionPayload } from '@/lib/types';

function mayManage(session: SessionPayload): boolean {
  return canManageWorship(
    session.role as any,
    session.isBureauLeader || session.isBureauMember,
    session.isAdmin
  );
}

// 상세(이미지 포함) 조회 — 팝업/편집에서 필요할 때만 불러온다.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data } = await supabase
    .from('worship_announcements')
    .select('*')
    .eq('id', params.id)
    .eq('department_id', session.departmentId)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ item: rowToWorship(data as Record<string, unknown>) });
}

// 특별 광고 수정 (id 기준)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!mayManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const input = normalizeWorshipInput(await request.json().catch(() => null));
  if (!input.title) {
    return NextResponse.json({ error: '광고 제목을 입력해주세요.' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('worship_announcements')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('department_id', session.departmentId)
    .is('key', null); // 고정 버튼은 이 경로로 수정하지 않는다.

  if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true });
}

// 특별 광고 삭제 (고정 버튼은 삭제 불가)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!mayManage(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createClient();
  const { error } = await supabase
    .from('worship_announcements')
    .delete()
    .eq('id', params.id)
    .eq('department_id', session.departmentId)
    .is('key', null);

  if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
