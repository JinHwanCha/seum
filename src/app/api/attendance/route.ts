import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canCheckAttendance } from '@/lib/permissions';
import type { Role } from '@/lib/types';

// GET: 특정 주의 출석 데이터 조회
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('weekStart');
  const cellId = searchParams.get('cellId');

  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart required' }, { status: 400 });
  }

  const supabase = createClient();

  let targetCellIds: string[] = [];
  if (cellId) {
    targetCellIds = [cellId];
  } else if (session.cellId) {
    targetCellIds = [session.cellId];
  }

  if (targetCellIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data: members } = await supabase
    .from('users')
    .select('id')
    .in('cell_id', targetCellIds)
    .eq('is_approved', true)
    .eq('is_graduated', false);

  if (!members || members.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .in('user_id', members.map((m) => m.id))
    .eq('week_start', weekStart);

  return NextResponse.json({ data: attendance || [] });
}

// PATCH: 개별 필드 업데이트 — 빠른 fire-and-forget용
// 권한 체크는 session 기반으로만 수행 (DB 조회 없음)
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 최소 권한: cell_leader 이상만 가능
  if (!session.isAdmin && session.role !== 'minister' && session.role !== 'village_leader' && session.role !== 'cell_leader') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, weekStart, field, value } = body;

  if (!userId || !weekStart || !field) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const allowedFields = ['worship_service', 'department_meeting', 'small_group', 'prayer_count', 'qt_count', 'bible_reading'];
  if (!allowedFields.includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  }

  if (field === 'worship_service' && value !== null && !['1부', '2부', '3부'].includes(value)) {
    return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
  }

  if ((field === 'prayer_count' || field === 'qt_count') && (typeof value !== 'number' || value < 0 || value > 7)) {
    return NextResponse.json({ error: 'Count must be 0-7' }, { status: 400 });
  }

  const supabase = createClient();

  const updateData: Record<string, unknown> = {
    user_id: userId,
    department_id: session.departmentId,
    week_start: weekStart,
    checked_by: session.userId,
    updated_at: new Date().toISOString(),
  };
  updateData[field] = value;

  const { error } = await supabase
    .from('attendance')
    .upsert(updateData, { onConflict: 'user_id,week_start' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
