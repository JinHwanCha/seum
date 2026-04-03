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

  // Determine which cell(s) to fetch attendance for
  let targetCellIds: string[] = [];

  if (cellId) {
    targetCellIds = [cellId];
  } else if (session.cellId) {
    targetCellIds = [session.cellId];
  }

  if (targetCellIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Get members of the cell(s)
  const { data: members } = await supabase
    .from('users')
    .select('id, cell_id, village_id')
    .in('cell_id', targetCellIds)
    .eq('is_approved', true)
    .eq('is_graduated', false);

  if (!members || members.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const memberIds = members.map((m) => m.id);

  // Get attendance records
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .in('user_id', memberIds)
    .eq('week_start', weekStart);

  return NextResponse.json({ data: attendance || [] });
}

// POST: 출석 체크 (upsert)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { userId, weekStart, worshipService, departmentMeeting, smallGroup } = body;

  if (!userId || !weekStart) {
    return NextResponse.json({ error: 'userId and weekStart required' }, { status: 400 });
  }

  // Validate worshipService
  if (worshipService !== null && worshipService !== undefined && !['1부', '2부', '3부'].includes(worshipService)) {
    return NextResponse.json({ error: 'Invalid worship service' }, { status: 400 });
  }

  const supabase = createClient();

  // Get target user info for permission check
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, cell_id, village_id, department_id')
    .eq('id', userId)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Permission check
  const hasPermission = canCheckAttendance(
    session.role as Role,
    session.cellId,
    targetUser.cell_id,
    session.villageId,
    targetUser.village_id,
    session.isAdmin
  );

  if (!hasPermission) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  // Upsert attendance record
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        user_id: userId,
        department_id: targetUser.department_id,
        week_start: weekStart,
        worship_service: worshipService ?? null,
        department_meeting: departmentMeeting ?? false,
        small_group: smallGroup ?? false,
        checked_by: session.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// PATCH: 개별 필드 업데이트 (토글용)
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { userId, weekStart, field, value } = body;

  if (!userId || !weekStart || !field) {
    return NextResponse.json({ error: 'userId, weekStart, field required' }, { status: 400 });
  }

  const allowedFields = ['worship_service', 'department_meeting', 'small_group'];
  if (!allowedFields.includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  }

  if (field === 'worship_service' && value !== null && !['1부', '2부', '3부'].includes(value)) {
    return NextResponse.json({ error: 'Invalid worship service value' }, { status: 400 });
  }

  const supabase = createClient();

  // Get target user info
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, cell_id, village_id, department_id')
    .eq('id', userId)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Permission check
  const hasPermission = canCheckAttendance(
    session.role as Role,
    session.cellId,
    targetUser.cell_id,
    session.villageId,
    targetUser.village_id,
    session.isAdmin
  );

  if (!hasPermission) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  // Upsert with the specific field
  const updateData: Record<string, unknown> = {
    user_id: userId,
    department_id: targetUser.department_id,
    week_start: weekStart,
    checked_by: session.userId,
    updated_at: new Date().toISOString(),
  };
  updateData[field] = value;

  const { data, error } = await supabase
    .from('attendance')
    .upsert(updateData, { onConflict: 'user_id,week_start' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
