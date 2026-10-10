import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSmallGroupData } from '@/lib/small-group-data';
import { createClient } from '@/lib/supabase';
import type { Attendance } from '@/lib/types';
import { getSmallGroupContext, getSmallGroupUserIds } from '@/lib/small-group-context';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  try {
    if (searchParams.get('contextOnly') === 'true') {
      return NextResponse.json(await getSmallGroupContext(session), { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const weekStart = searchParams.get('weekStart');
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: '유효한 주차 날짜가 필요합니다.' }, { status: 400 });
    }

    if (searchParams.get('attendanceOnly') === 'true') {
      const context = await getSmallGroupContext(session);
      const userIds = await getSmallGroupUserIds(session, context);
      let query = createClient().from('attendance').select('*')
        .eq('department_id', session.departmentId).eq('week_start', weekStart);
      if (userIds) query = query.in('user_id', userIds);
      const { data, error } = await query;
      if (error) throw error;
      const attendanceMap: Record<string, Attendance> = {};
      for (const attendance of data || []) attendanceMap[attendance.user_id] = attendance;
      return NextResponse.json({ attendanceMap }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const mode = searchParams.get('mode');
    if (mode !== null && mode !== 'structure' && mode !== 'prayer') {
      return NextResponse.json({ error: '지원하지 않는 소그룹 조회 모드입니다.' }, { status: 400 });
    }
    const data = await getSmallGroupData(session, weekStart, {
      includePrayers: mode !== 'structure',
      includeAttendance: mode !== 'structure' && mode !== 'prayer',
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Small group lookup failed:', error);
    return NextResponse.json({ error: '소그룹 정보를 불러오지 못했습니다. 다시 시도해주세요.' }, { status: 503 });
  }
}
