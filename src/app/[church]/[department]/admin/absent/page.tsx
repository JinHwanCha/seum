import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canAccessAdmin } from '@/lib/permissions';
import { AlertTriangle } from 'lucide-react';
import type { Role } from '@/lib/types';
import { AdminBackButton } from '@/components/admin/back-button';
import { AbsentList, type AbsentMember } from '@/components/admin/absent-list';

// 몇 주 연속 결석하면 장기미출석으로 표기할지
const MIN_STREAK = 3;

async function getAbsentData(departmentId: string) {
  const supabase = createClient();

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentSunday = new Date(now);
  currentSunday.setDate(now.getDate() - dayOfWeek);
  currentSunday.setHours(0, 0, 0, 0);

  const empty = {
    worship: [] as AbsentMember[],
    department: [] as AbsentMember[],
    smallGroup: [] as AbsentMember[],
    totalMembers: 0,
  };

  // 조직 구조 단일 쿼리 (embedded)
  const { data: groupYear } = await supabase
    .from('group_years')
    .select('id, villages(id, name, cells(id, name))')
    .eq('department_id', departmentId)
    .eq('is_active', true)
    .single();

  if (!groupYear) return empty;

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

  if (allCellIds.length === 0) return empty;

  const { data: members } = await supabase
    .from('users')
    .select('id, name, role, phone, birth_date, village_id, cell_id')
    .eq('department_id', departmentId)
    .eq('is_approved', true)
    .eq('is_graduated', false)
    .in('cell_id', allCellIds);

  if (!members || members.length === 0) return empty;

  const memberIds = members.map((m) => m.id);

  // 전체 기간 출석 기록 (윈도우 없음) — 카테고리별 마지막 참여 주 계산
  const { data: records } = await supabase
    .from('attendance')
    .select('user_id, week_start, worship_service, department_meeting, small_group')
    .in('user_id', memberIds);

  const lastWorship: Record<string, string> = {};
  const lastDept: Record<string, string> = {};
  const lastSg: Record<string, string> = {};

  (records || []).forEach((a) => {
    if (a.worship_service && (!lastWorship[a.user_id] || a.week_start > lastWorship[a.user_id])) {
      lastWorship[a.user_id] = a.week_start;
    }
    if (a.department_meeting && (!lastDept[a.user_id] || a.week_start > lastDept[a.user_id])) {
      lastDept[a.user_id] = a.week_start;
    }
    if (a.small_group && (!lastSg[a.user_id] || a.week_start > lastSg[a.user_id])) {
      lastSg[a.user_id] = a.week_start;
    }
  });

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  // 마지막 참여 주 이후 이번 주까지의 연속 결석 주수. 기록 없으면 null.
  const streakWeeks = (lastStr?: string): number | null => {
    if (!lastStr) return null;
    const last = new Date(lastStr + 'T00:00:00');
    const diff = Math.round((currentSunday.getTime() - last.getTime()) / WEEK_MS);
    return diff < 0 ? 0 : diff;
  };

  const buildList = (lastMap: Record<string, string>): AbsentMember[] =>
    members
      .map((m) => ({ m, last: lastMap[m.id], streak: streakWeeks(lastMap[m.id]) }))
      // 기록 없음(null) 또는 3주 연속 이상 결석
      .filter((x) => x.streak === null || x.streak >= MIN_STREAK)
      .map(({ m, last, streak }) => {
        const cellInfo = m.cell_id ? cellMap[m.cell_id] : null;
        return {
          id: m.id,
          name: m.name,
          role: m.role,
          phone: m.phone,
          birth_date: m.birth_date,
          village_name: m.village_id ? villageMap[m.village_id] : null,
          cell_name: cellInfo?.name || null,
          last_attended: last || null,
          absent_weeks: streak,
        };
      })
      .sort((a, b) => {
        // 기록 없음 먼저 → 연속 결석 주수 많은 순 → 이름순
        if (a.absent_weeks === null && b.absent_weeks === null) return a.name.localeCompare(b.name);
        if (a.absent_weeks === null) return -1;
        if (b.absent_weeks === null) return 1;
        if (b.absent_weeks !== a.absent_weeks) return b.absent_weeks - a.absent_weeks;
        return a.name.localeCompare(b.name);
      });

  return {
    worship: buildList(lastWorship),
    department: buildList(lastDept),
    smallGroup: buildList(lastSg),
    totalMembers: members.length,
  };
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

async function AbsentContent({ departmentId }: { departmentId: string }) {
  const { worship, department, smallGroup, totalMembers } = await getAbsentData(departmentId);

  return (
    <AbsentList
      worship={worship}
      department={department}
      smallGroup={smallGroup}
      totalMembers={totalMembers}
    />
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <AdminBackButton />
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

