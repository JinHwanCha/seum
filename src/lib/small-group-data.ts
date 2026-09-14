import { createClient } from '@/lib/supabase';
import type { SessionPayload } from '@/lib/types';

// 멤버 정렬: 목자 우선, 그다음 이름순. 서버에서만 정렬해 SSR/CSR 순서를 일치시킨다
// (localeCompare 결과가 Node/브라우저 간 다를 수 있어 클라이언트 정렬은 hydration 불일치를 유발).
const byLeaderThenName = (a: any, b: any) => {
  if (a.role === 'cell_leader' && b.role !== 'cell_leader') return -1;
  if (a.role !== 'cell_leader' && b.role === 'cell_leader') return 1;
  return (a.name || '').localeCompare(b.name || '', 'ko');
};

export async function getSmallGroupData(session: SessionPayload, weekStart: string) {
  const supabase = createClient();

  // 세션 JWT는 로그인 시점 스냅샷이라 관리자 배정 변경이 즉시 반영되지 않음.
  // 항상 DB에서 최신 cell/village를 조회한다.
  const { data: freshUser } = await supabase
    .from('users')
    .select('role, cell_id, village_id')
    .eq('id', session.userId)
    .single();

  const cellId = freshUser?.cell_id ?? session.cellId ?? null;
  const villageId = freshUser?.village_id ?? session.villageId ?? null;
  const role = (freshUser?.role as string) ?? session.role;

  // 모든 쿼리(base + role별)를 동시에 시작해 워터폴 제거
  const basePromises = [
    cellId
      ? supabase.from('cells').select('id, name, village_id').eq('id', cellId).single()
      : Promise.resolve({ data: null }),
    villageId
      ? supabase.from('villages').select('name, is_new_member_team').eq('id', villageId).single()
      : Promise.resolve({ data: null }),
    cellId
      ? supabase.from('users').select('id, name, role, minister_rank, phone, birth_date').eq('cell_id', cellId).eq('is_approved', true).eq('is_graduated', false).order('role', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from('prayer_requests')
      .select('*, user:users(id, name, role, minister_rank, village_id, cell_id, birth_date)')
      .eq('department_id', session.departmentId)
      .eq('week_start', weekStart)
      .order('created_at', { ascending: true }),
    supabase
      .from('attendance')
      .select('*')
      .eq('department_id', session.departmentId)
      .eq('week_start', weekStart),
  ] as const;

  // role별 추가 쿼리도 동시에 시작
  const rolePromises = role === 'minister'
    ? [
        supabase
          .from('group_years')
          .select('id, villages(id, name, sort_order, cells(id, name, sort_order))')
          .eq('department_id', session.departmentId)
          .eq('is_active', true)
          .single(),
        supabase
          .from('users')
          .select('id, name, role, cell_id, village_id, birth_date')
          .eq('department_id', session.departmentId)
          .eq('is_approved', true)
          .eq('is_graduated', false),
      ]
    : (role === 'village_leader' || role === 'cell_leader' || role === 'cell_member') && villageId
    ? [
        supabase.from('cells').select('id, village_id, name, sort_order').eq('village_id', villageId).order('sort_order'),
        supabase.from('users').select('id, name, role, cell_id, birth_date').eq('village_id', villageId).eq('is_approved', true).eq('is_graduated', false),
      ]
    : [];

  // 모든 쿼리 동시 실행
  const [baseResults, roleResults] = await Promise.all([
    Promise.all(basePromises),
    Promise.all(rolePromises),
  ]);

  const [cellResult, villageResult, cellMembersResult, deptPrayersResult, deptAttendanceResult] = baseResults;

  let cell = cellResult.data;
  const villageName = villageResult.data?.name || null;
  const isNewFamilyTeam = !!villageResult.data?.is_new_member_team;
  let members = ((cellMembersResult.data || []) as any[]).sort(byLeaderThenName);
  const leader = members.find((m: any) => m.role === 'cell_leader');
  let leaderInfo = leader ? { id: leader.id, name: leader.name } : null;

  const allDeptPrayers = (deptPrayersResult.data || []) as any[];
  const allDeptAttendance = (deptAttendanceResult.data || []) as any[];

  const memberIdSet = new Set(members.map((m: any) => m.id));
  // 내 소그룹 기도제목은 작성자 이름순으로 정렬(서버에서 확정).
  const prayers = allDeptPrayers
    .filter((p: any) => memberIdSet.has(p.user_id))
    .sort((a: any, b: any) => (a.user?.name || '').localeCompare(b.user?.name || '', 'ko'));
  // 본인 기도제목은 소그룹 소속과 무관하게(마을장 등 셀 미배정 포함) 항상 찾는다.
  const myPrayer = allDeptPrayers.find((p: any) => p.user_id === session.userId) || null;

  const attendanceMap: Record<string, any> = {};
  allDeptAttendance.forEach((a: any) => { attendanceMap[a.user_id] = a; });

  let villageCells: any[] = [];

  if (role === 'minister') {
    const [groupYearResult, deptMembersResult] = roleResults as any[];

    const groupYear = groupYearResult.data as any;
    const villages = (groupYear?.villages || []) as any[];
    const allDeptMembers = (deptMembersResult.data || []) as any[];

    const leaderMap: Record<string, string> = {};
    allDeptMembers
      .filter((u: any) => u.role === 'cell_leader')
      .forEach((l: any) => { if (l.cell_id) leaderMap[l.cell_id] = l.name; });
    // 마을장도 자기 셀의 리더로 표시(목자 없는 셀 한정).
    allDeptMembers
      .filter((u: any) => u.role === 'village_leader')
      .forEach((u: any) => { if (u.cell_id && !leaderMap[u.cell_id]) leaderMap[u.cell_id] = u.name; });

    // 마을별 마을장의 소속 셀(최상단 배치용)
    const vLeaderCellByVillage: Record<string, string> = {};
    allDeptMembers
      .filter((u: any) => u.role === 'village_leader')
      .forEach((u: any) => { if (u.village_id && u.cell_id) vLeaderCellByVillage[u.village_id] = u.cell_id; });

    const cellMembersMap: Record<string, any[]> = {};
    allDeptMembers.forEach((m: any) => {
      if (m.cell_id) {
        if (!cellMembersMap[m.cell_id]) cellMembersMap[m.cell_id] = [];
        cellMembersMap[m.cell_id].push(m);
      }
    });

    const prayerByCellUser: Record<string, any> = {};
    allDeptPrayers.forEach((p: any) => {
      if (p.user?.cell_id) prayerByCellUser[`${p.user.cell_id}:${p.user_id}`] = p;
    });

    villageCells = villages
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((v: any) => {
        const vLeaderCellId = vLeaderCellByVillage[v.id];
        return {
        id: v.id,
        name: v.name,
        sort_order: v.sort_order,
        // 마을장 소속 셀을 최상단, 그다음 셀 표시 이름(셀 이름 또는 목자 이름)순
        cells: ((v.cells || []) as any[])
          .sort((a: any, b: any) => {
            if (vLeaderCellId) {
              if (a.id === vLeaderCellId) return -1;
              if (b.id === vLeaderCellId) return 1;
            }
            const an = a.name || leaderMap[a.id] || '';
            const bn = b.name || leaderMap[b.id] || '';
            return an.localeCompare(bn, 'ko');
          })
          .map((c: any) => ({
            ...c,
            leader_name: leaderMap[c.id] || null,
            members: (cellMembersMap[c.id] || []).sort(byLeaderThenName),
            prayers: (cellMembersMap[c.id] || [])
              .map((m: any) => prayerByCellUser[`${c.id}:${m.id}`])
              .filter(Boolean),
          })),
        };
      });
  } else if ((role === 'village_leader' || role === 'cell_leader' || role === 'cell_member') && villageId) {
    const [vCellsResult, villageMembersResult] = roleResults as any[];

    const vCells = (vCellsResult.data || []) as any[];
    const allVillageMembers = (villageMembersResult.data || []) as any[];

    const leaderMap: Record<string, string> = {};
    allVillageMembers
      .filter((u: any) => u.role === 'cell_leader')
      .forEach((l: any) => { if (l.cell_id) leaderMap[l.cell_id] = l.name; });
    // 마을장도 자기 셀의 리더로 표시(목자 없는 셀 한정).
    allVillageMembers
      .filter((u: any) => u.role === 'village_leader')
      .forEach((u: any) => { if (u.cell_id && !leaderMap[u.cell_id]) leaderMap[u.cell_id] = u.name; });

    // 마을장의 소속 셀(최상단 배치용)
    const vLeaderCellId = allVillageMembers.find((u: any) => u.role === 'village_leader')?.cell_id || null;

    const cellMembersMap: Record<string, any[]> = {};
    allVillageMembers.forEach((m: any) => {
      if (m.cell_id) {
        if (!cellMembersMap[m.cell_id]) cellMembersMap[m.cell_id] = [];
        cellMembersMap[m.cell_id].push(m);
      }
    });

    const cellIdSet = new Set(vCells.map((c: any) => c.id));
    // 셀장/셀원: 다른 셀의 "소그룹에만 공개" 글은 가시성 차단
    // 마을장: 자기 마을 전체(소그룹공개 포함) 열람
    const restrictCellOnly = role === 'cell_leader' || role === 'cell_member';
    const prayerByCellUser: Record<string, any> = {};
    allDeptPrayers.forEach((p: any) => {
      if (!p.user?.cell_id || !cellIdSet.has(p.user.cell_id)) return;
      if (restrictCellOnly && p.is_cell_only && p.user.cell_id !== cellId) return;
      prayerByCellUser[`${p.user.cell_id}:${p.user_id}`] = p;
    });

    villageCells = [{
      id: villageId,
      name: villageName,
      // 마을장 소속 셀을 최상단, 그다음 셀 표시 이름(셀 이름 또는 목자 이름)순
      cells: [...vCells]
        .sort((a: any, b: any) => {
          if (vLeaderCellId) {
            if (a.id === vLeaderCellId) return -1;
            if (b.id === vLeaderCellId) return 1;
          }
          const an = a.name || leaderMap[a.id] || '';
          const bn = b.name || leaderMap[b.id] || '';
          return an.localeCompare(bn, 'ko');
        })
        .map((c: any) => ({
        ...c,
        leader_name: leaderMap[c.id] || null,
        members: (cellMembersMap[c.id] || []).sort(byLeaderThenName),
        prayers: (cellMembersMap[c.id] || [])
          .map((m: any) => prayerByCellUser[`${c.id}:${m.id}`])
          .filter(Boolean),
      })),
    }];

    // 마을장의 '내 소그룹'(경건생활) = 마을의 목자들. 마을장이 소그룹장이 된다.
    if (role === 'village_leader') {
      members = allVillageMembers
        .filter((u: any) => u.role === 'cell_leader')
        .sort(byLeaderThenName);
      const me = allVillageMembers.find((u: any) => u.id === session.userId);
      if (me) leaderInfo = { id: me.id, name: me.name };
      cell = {
        id: cellId || `village-leaders-${villageId}`,
        name: villageName ? `${villageName} 리더` : '마을 리더',
      } as any;
    }
  }

  return {
    cell,
    villageName,
    leader: leaderInfo,
    members,
    myPrayer,
    prayers,
    villageCells,
    attendanceMap,
    currentUser: {
      role,
      cellId,
      villageId,
      isNewFamilyTeam,
    },
  };
}
