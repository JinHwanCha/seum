import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canAccessAdmin } from '@/lib/permissions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS_DEFAULT } from '@/lib/constants';
import { AlertTriangle, User, Calendar, Phone } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import type { Role } from '@/lib/types';

interface AbsentMember {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  birth_date: string | null;
  village_name: string | null;
  cell_name: string | null;
  last_attended: string | null;
  absent_weeks: number;
}

async function getAbsentData(departmentId: string) {
  const supabase = createClient();

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentSunday = new Date(now);
  currentSunday.setDate(now.getDate() - dayOfWeek);
  const currentWeekStr = currentSunday.toISOString().split('T')[0];

  const fourWeeksAgo = new Date(currentSunday);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0];

  // 조직 구조 단일 쿼리 (embedded) — 5단계 워터폴 → 3단계
  const { data: groupYear } = await supabase
    .from('group_years')
    .select('id, villages(id, name, cells(id, name))')
    .eq('department_id', departmentId)
    .eq('is_active', true)
    .single();

  if (!groupYear) return { data: [], totalMembers: 0, periodWeeks: 0 };

  const villageMap: Record<string, string> = {};
  const cellMap: Record<string, { name: string | null; village_id: string }> = {};
  const allCellIds: string[] = [];

  ((groupYear as any).villages || []).forEach((v: any) => {
    villageMap[v.id] = v.name;
    (v.cells || []).forEach((c: any) => {
      cellMap[c.id] = { name: c.name, village_id: v.id };
      allCellIds.push(c.id);
    });
  });

  if (allCellIds.length === 0) return { data: [], totalMembers: 0, periodWeeks: 0 };

  const { data: members } = await supabase
    .from('users')
    .select('id, name, role, phone, birth_date, village_id, cell_id')
    .eq('department_id', departmentId)
    .eq('is_approved', true)
    .eq('is_graduated', false)
    .in('cell_id', allCellIds);

  if (!members || members.length === 0) return { data: [], totalMembers: 0, periodWeeks: 0 };

  const memberIds = members.map((m) => m.id);

  const [{ data: attendanceRecords }, { data: lastAttendance }] = await Promise.all([
    supabase
      .from('attendance')
      .select('user_id, week_start, worship_service, department_meeting, small_group, prayer_count, qt_count, bible_reading')
      .in('user_id', memberIds)
      .gte('week_start', fourWeeksAgoStr)
      .lte('week_start', currentWeekStr),
    supabase
      .from('attendance')
      .select('user_id, week_start')
      .in('user_id', memberIds)
      .or('worship_service.not.is.null,department_meeting.eq.true,small_group.eq.true,prayer_count.gt.0,qt_count.gt.0,bible_reading.eq.true')
      .order('week_start', { ascending: false }),
  ]);

  const userAttendedWeeks: Record<string, Set<string>> = {};
  (attendanceRecords || []).forEach((a) => {
    const attended = a.worship_service || a.department_meeting || a.small_group || a.prayer_count > 0 || a.qt_count > 0 || a.bible_reading;
    if (attended) {
      if (!userAttendedWeeks[a.user_id]) userAttendedWeeks[a.user_id] = new Set();
      userAttendedWeeks[a.user_id].add(a.week_start);
    }
  });

  const lastAttendedMap: Record<string, string> = {};
  (lastAttendance || []).forEach((a) => {
    if (!lastAttendedMap[a.user_id]) lastAttendedMap[a.user_id] = a.week_start;
  });

  const weeks: string[] = [];
  const d = new Date(fourWeeksAgo);
  while (d <= currentSunday) {
    weeks.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 7);
  }
  const totalWeeks = weeks.length;

  const absentMembers: AbsentMember[] = members
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
      if (!a.last_attended && !b.last_attended) return a.name.localeCompare(b.name);
      if (!a.last_attended) return -1;
      if (!b.last_attended) return 1;
      return a.last_attended.localeCompare(b.last_attended);
    });

  return { data: absentMembers, totalMembers: members.length, periodWeeks: totalWeeks };
}

function AbsentSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="flex gap-2">
        <div className="h-6 w-24 bg-stone-100 rounded-full" />
        <div className="h-6 w-24 bg-stone-100 rounded-full" />
        <div className="h-6 w-24 bg-stone-100 rounded-full" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 bg-stone-100 rounded-xl" />
      ))}
    </div>
  );
}

async function AbsentContent({ departmentId, periodWeeksLabel }: { departmentId: string; periodWeeksLabel?: string }) {
  const { data: members, totalMembers, periodWeeks } = await getAbsentData(departmentId);

  return (
    <>
      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="warning">최근 {periodWeeks}주 기준</Badge>
        <Badge variant="danger">{members.length}명 미출석</Badge>
        <Badge variant="default">전체 {totalMembers}명 중</Badge>
      </div>

      {members.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-stone-400">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">장기미출석자가 없습니다.</p>
            <p className="text-xs mt-1">모든 멤버가 최근 {periodWeeks}주 내에 출석했습니다.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id} className="!p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <User size={14} className="text-stone-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-stone-900 truncate">
                      {m.name}
                      {m.birth_date && (
                        <span className="text-stone-400 font-normal"> ({m.birth_date.substring(2, 4)})</span>
                      )}
                    </span>
                    <Badge variant="default">{ROLE_LABELS_DEFAULT[m.role] || m.role}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                    {m.village_name && <span>{m.village_name}</span>}
                    {m.cell_name && <span>{m.cell_name}</span>}
                    {m.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} />
                        {m.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant="danger">{m.absent_weeks}주 미출석</Badge>
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {m.last_attended ? `마지막: ${formatDate(m.last_attended)}` : '출석 기록 없음'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default async function AbsentMembersPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!canAccessAdmin(session.role as Role, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return (
      <div className="text-center py-12 text-stone-400 text-sm">
        접근 권한이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          <h1 className="text-lg font-bold text-stone-900">장기미출석</h1>
        </div>
      </div>
      <Suspense fallback={<AbsentSkeleton />}>
        <AbsentContent departmentId={session.departmentId} />
      </Suspense>
    </div>
  );
}

