import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('weekStart');
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 });

  const supabase = createClient();
  const cellId = session.cellId;
  const villageId = session.villageId;

  // --- 1. Parallel: cell info + village name + cell members ---
  const [cellResult, villageResult, cellMembersResult] = await Promise.all([
    cellId
      ? supabase.from('cells').select('id, name, village_id').eq('id', cellId).single()
      : Promise.resolve({ data: null }),
    villageId
      ? supabase.from('villages').select('name').eq('id', villageId).single()
      : Promise.resolve({ data: null }),
    cellId
      ? supabase.from('users').select('id, name, role, minister_rank, phone').eq('cell_id', cellId).eq('is_approved', true).order('role', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const cell = cellResult.data;
  const villageName = villageResult.data?.name || null;
  const members = cellMembersResult.data || [];
  const leader = members.find((m: any) => m.role === 'cell_leader');
  const leaderInfo = leader ? { id: leader.id, name: leader.name } : null;

  // --- 2. Get prayer requests for cell members this week ---
  const memberIds = members.map((m: any) => m.id);
  let prayers: any[] = [];

  if (memberIds.length > 0) {
    const { data: p } = await supabase
      .from('prayer_requests')
      .select('*, user:users(id, name, role, minister_rank, village_id, cell_id)')
      .in('user_id', memberIds)
      .eq('week_start', weekStart)
      .order('created_at', { ascending: true });
    prayers = p || [];
  }

  const myPrayer = prayers.find((p: any) => p.user_id === session.userId) || null;

  // --- 5. For ministers / village leaders: get all cells in their village ---
  let villageCells: any[] = [];
  let allVillagePrayers: any[] = [];

  if (session.role === 'minister') {
    // Ministers see everything - get all villages & cells
    const { data: groupYear } = await supabase
      .from('group_years')
      .select('id')
      .eq('department_id', session.departmentId)
      .eq('is_active', true)
      .single();

    if (groupYear) {
      const { data: villages } = await supabase
        .from('villages')
        .select('id, name, sort_order')
        .eq('group_year_id', groupYear.id)
        .order('sort_order');

      const vIds = (villages || []).map((v) => v.id);
      if (vIds.length > 0) {
        const { data: allCells } = await supabase
          .from('cells')
          .select('id, village_id, name, sort_order')
          .in('village_id', vIds)
          .order('sort_order');

        const cIds = (allCells || []).map((c) => c.id);

        // Parallel: leaders + members + prayers
        const [leadersResult, allMembersResult, deptPrayersResult] = await Promise.all([
          cIds.length > 0
            ? supabase.from('users').select('name, cell_id').in('cell_id', cIds).eq('role', 'cell_leader')
            : Promise.resolve({ data: [] }),
          cIds.length > 0
            ? supabase.from('users').select('id, name, role, cell_id').in('cell_id', cIds).eq('is_approved', true)
            : Promise.resolve({ data: [] }),
          supabase.from('prayer_requests')
            .select('*, user:users(id, name, role, minister_rank, village_id, cell_id)')
            .eq('department_id', session.departmentId)
            .eq('week_start', weekStart)
            .order('created_at', { ascending: true }),
        ]);

        const leaderMap: Record<string, string> = {};
        (leadersResult.data || []).forEach((l: any) => {
          if (l.cell_id) leaderMap[l.cell_id] = l.name;
        });

        const cellMembersMap: Record<string, any[]> = {};
        (allMembersResult.data || []).forEach((m: any) => {
          if (m.cell_id) {
            if (!cellMembersMap[m.cell_id]) cellMembersMap[m.cell_id] = [];
            cellMembersMap[m.cell_id].push(m);
          }
        });

        const prayerByCellUser: Record<string, any> = {};
        (deptPrayersResult.data || []).forEach((p: any) => {
          if (p.user?.cell_id) {
            prayerByCellUser[`${p.user.cell_id}:${p.user_id}`] = p;
          }
        });

        villageCells = (villages || []).map((v) => ({
          ...v,
          cells: (allCells || [])
            .filter((c) => c.village_id === v.id)
            .map((c) => ({
              ...c,
              leader_name: leaderMap[c.id] || null,
              members: (cellMembersMap[c.id] || []).sort((a: any, b: any) => {
                if (a.role === 'cell_leader') return -1;
                if (b.role === 'cell_leader') return 1;
                return 0;
              }),
              prayers: (cellMembersMap[c.id] || []).map((m: any) => prayerByCellUser[`${c.id}:${m.id}`]).filter(Boolean),
            })),
        }));
      }
    }
  } else if (session.role === 'village_leader' && villageId) {
    // Village leaders see all cells in their village
    const { data: vCells } = await supabase
      .from('cells')
      .select('id, village_id, name, sort_order')
      .eq('village_id', villageId)
      .order('sort_order');

    const cIds = (vCells || []).map((c) => c.id);
    let leaderMap: Record<string, string> = {};
    let cellMembersMap: Record<string, any[]> = {};

    if (cIds.length > 0) {
      // Parallel: leaders + members
      const [leadersResult, allMembersResult] = await Promise.all([
        supabase.from('users').select('name, cell_id').in('cell_id', cIds).eq('role', 'cell_leader'),
        supabase.from('users').select('id, name, role, cell_id').in('cell_id', cIds).eq('is_approved', true),
      ]);

      (leadersResult.data || []).forEach((l: any) => {
        if (l.cell_id) leaderMap[l.cell_id] = l.name;
      });

      (allMembersResult.data || []).forEach((m: any) => {
        if (m.cell_id) {
          if (!cellMembersMap[m.cell_id]) cellMembersMap[m.cell_id] = [];
          cellMembersMap[m.cell_id].push(m);
        }
      });

      const memberIds = (allMembersResult.data || []).map((m: any) => m.id);
      const { data: vPrayers } = await supabase
        .from('prayer_requests')
        .select('*, user:users(id, name, role, minister_rank, village_id, cell_id)')
        .in('user_id', memberIds)
        .eq('week_start', weekStart)
        .order('created_at', { ascending: true });

      const prayerByCellUser: Record<string, any> = {};
      (vPrayers || []).forEach((p) => {
        if (p.user?.cell_id) {
          prayerByCellUser[`${p.user.cell_id}:${p.user_id}`] = p;
        }
      });

      villageCells = [{
        id: villageId,
        name: villageName,
        cells: (vCells || []).map((c) => ({
          ...c,
          leader_name: leaderMap[c.id] || null,
          members: (cellMembersMap[c.id] || []).sort((a: any, b: any) => {
            if (a.role === 'cell_leader') return -1;
            if (b.role === 'cell_leader') return 1;
            return 0;
          }),
          prayers: (cellMembersMap[c.id] || []).map((m: any) => prayerByCellUser[`${c.id}:${m.id}`]).filter(Boolean),
        })),
      }];
    }
  }

  return NextResponse.json({
    cell,
    villageName,
    leader: leaderInfo,
    members,
    prayers,
    myPrayer,
    villageCells,
  });
}
