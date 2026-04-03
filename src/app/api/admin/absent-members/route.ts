import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canAccessAdmin } from '@/lib/permissions';
import type { Role } from '@/lib/types';

// GET: 4주 이상 장기미출석자 리스트
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = canAccessAdmin(
    session.role as Role,
    session.isBureauLeader || session.isBureauMember,
    session.isAdmin
  );
  if (!hasAccess) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

  const supabase = createClient();

  // Get the current week's Sunday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentSunday = new Date(now);
  currentSunday.setDate(now.getDate() - dayOfWeek);
  const currentWeekStr = currentSunday.toISOString().split('T')[0];

  // 4 weeks ago Sunday
  const fourWeeksAgo = new Date(currentSunday);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];

  // Get active group year
  const { data: groupYear } = await supabase
    .from('group_years')
    .select('id')
    .eq('department_id', session.departmentId)
    .eq('is_active', true)
    .single();

  if (!groupYear) return NextResponse.json({ data: [] });

  // Get all villages in active group year
  const { data: villages } = await supabase
    .from('villages')
    .select('id, name')
    .eq('group_year_id', groupYear.id);

  const villageIds = (villages || []).map((v) => v.id);
  if (villageIds.length === 0) return NextResponse.json({ data: [] });

  const villageMap: Record<string, string> = {};
  (villages || []).forEach((v) => { villageMap[v.id] = v.name; });

  // Get all cells
  const { data: cells } = await supabase
    .from('cells')
    .select('id, village_id, name')
    .in('village_id', villageIds);

  const cellMap: Record<string, { name: string | null; village_id: string }> = {};
  (cells || []).forEach((c) => { cellMap[c.id] = { name: c.name, village_id: c.village_id }; });

  // Get all approved non-graduated members
  const { data: members } = await supabase
    .from('users')
    .select('id, name, role, phone, birth_date, village_id, cell_id')
    .eq('department_id', session.departmentId)
    .eq('is_approved', true)
    .eq('is_graduated', false)
    .in('cell_id', (cells || []).map((c) => c.id));

  if (!members || members.length === 0) return NextResponse.json({ data: [] });

  const memberIds = members.map((m) => m.id);

  // Get attendance records for the last 4 weeks
  const { data: attendanceRecords } = await supabase
    .from('attendance')
    .select('user_id, week_start, worship_service, department_meeting, small_group, prayer_count, qt_count, bible_reading')
    .in('user_id', memberIds)
    .gte('week_start', fourWeeksAgoStr)
    .lte('week_start', currentWeekStr);

  // Build attendance map: user_id -> set of weeks they attended (any of worship/dept/sg)
  const userAttendedWeeks: Record<string, Set<string>> = {};
  (attendanceRecords || []).forEach((a) => {
    const attended = a.worship_service || a.department_meeting || a.small_group || a.prayer_count > 0 || a.qt_count > 0 || a.bible_reading;
    if (attended) {
      if (!userAttendedWeeks[a.user_id]) userAttendedWeeks[a.user_id] = new Set();
      userAttendedWeeks[a.user_id].add(a.week_start);
    }
  });

  // Get the last attendance for each user (to show last attended date)
  const { data: lastAttendance } = await supabase
    .from('attendance')
    .select('user_id, week_start')
    .in('user_id', memberIds)
    .or('worship_service.not.is.null,department_meeting.eq.true,small_group.eq.true,prayer_count.gt.0,qt_count.gt.0,bible_reading.eq.true')
    .order('week_start', { ascending: false });

  const lastAttendedMap: Record<string, string> = {};
  (lastAttendance || []).forEach((a) => {
    if (!lastAttendedMap[a.user_id]) {
      lastAttendedMap[a.user_id] = a.week_start;
    }
  });

  // Calculate how many weeks (up to 5) each person actually has data
  // 4 weeks range = up to 5 possible Sundays
  const generateWeeks = () => {
    const weeks: string[] = [];
    const d = new Date(fourWeeksAgo);
    while (d <= currentSunday) {
      weeks.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 7);
    }
    return weeks;
  };
  const recentWeeks = generateWeeks();
  const totalWeeks = recentWeeks.length;

  // Filter users who have 0 attendance in the last 4 weeks
  const absentMembers = members
    .filter((m) => {
      const attended = userAttendedWeeks[m.id];
      return !attended || attended.size === 0;
    })
    .map((m) => {
      const cellInfo = m.cell_id ? cellMap[m.cell_id] : null;
      return {
        id: m.id,
        name: m.name,
        role: m.role,
        phone: m.phone,
        birth_date: m.birth_date,
        village_name: m.village_id ? villageMap[m.village_id] : null,
        cell_name: cellInfo?.name || null,
        last_attended: lastAttendedMap[m.id] || null,
        absent_weeks: totalWeeks,
      };
    })
    .sort((a, b) => {
      // Sort by last attended date (oldest first), null = never attended
      if (!a.last_attended && !b.last_attended) return a.name.localeCompare(b.name);
      if (!a.last_attended) return -1;
      if (!b.last_attended) return 1;
      return a.last_attended.localeCompare(b.last_attended);
    });

  return NextResponse.json({
    data: absentMembers,
    totalMembers: members.length,
    periodWeeks: totalWeeks,
    periodStart: fourWeeksAgoStr,
    periodEnd: currentWeekStr,
  });
}
