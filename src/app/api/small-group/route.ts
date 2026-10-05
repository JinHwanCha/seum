import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSmallGroupData } from '@/lib/small-group-data';
import { createClient } from '@/lib/supabase';
import type { Attendance } from '@/lib/types';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });

  if (searchParams.get('attendanceOnly') === 'true') {
    const { data, error } = await createClient()
      .from('attendance')
      .select('*')
      .eq('department_id', session.departmentId)
      .eq('week_start', weekStart);

    if (error) return NextResponse.json({ error: 'Attendance fetch failed' }, { status: 500 });

    const attendanceMap: Record<string, Attendance> = {};
    for (const attendance of data || []) {
      attendanceMap[attendance.user_id] = attendance;
    }
    return NextResponse.json({ attendanceMap });
  }

  const data = await getSmallGroupData(session, weekStart);
  return NextResponse.json(data);
}
