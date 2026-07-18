import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { isMinister } from '@/lib/permissions';
import { TOTAL_CHAPTERS } from '@/lib/bible';

interface MemberProgress {
  id: string;
  name: string;
  role: string;
  isMe: boolean;
  chaptersRead: number;
  lastReadAt: string | null;
}

// 유저별 (읽은 장 수, 마지막 읽은 시각) 집계
async function aggregateProgress(
  supabase: ReturnType<typeof createClient>,
  memberIds: string[]
) {
  const counts: Record<string, number> = {};
  const last: Record<string, string> = {};
  if (memberIds.length === 0) return { counts, last };

  const { data } = await supabase
    .from('bible_reading_progress')
    .select('user_id, read_at')
    .in('user_id', memberIds);

  (data || []).forEach((p) => {
    counts[p.user_id] = (counts[p.user_id] || 0) + 1;
    if (p.read_at && (!last[p.user_id] || p.read_at > last[p.user_id])) {
      last[p.user_id] = p.read_at;
    }
  });
  return { counts, last };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const canSeeAll = isMinister(session.role) || session.isAdmin;
  const isVillageLeader = session.role === 'village_leader' && !!session.villageId;

  // ─── 사역자/관리자: 부서 전체 · 마을장: 자기 마을 (마을 > 소그룹) ───
  if (canSeeAll || isVillageLeader) {
    const usersQueryBase = supabase
      .from('users')
      .select('id, name, role, minister_rank, village_id, cell_id')
      .eq('department_id', session.departmentId)
      .eq('is_graduated', false);

    const [orgResult, usersResult, leadersResult] = await Promise.all([
      supabase
        .from('group_years')
        .select('id, villages(id, name, sort_order, cells(id, name, sort_order))')
        .eq('department_id', session.departmentId)
        .eq('is_active', true)
        .single(),
      // 마을장은 자기 마을 구성원만
      isVillageLeader && !canSeeAll
        ? usersQueryBase.eq('village_id', session.villageId)
        : usersQueryBase,
      supabase
        .from('users')
        .select('id, name, cell_id')
        .eq('department_id', session.departmentId)
        .eq('role', 'cell_leader')
        .eq('is_graduated', false),
    ]);

    const users = (usersResult.data || []) as any[];
    const { counts, last } = await aggregateProgress(
      supabase,
      users.map((u) => u.id)
    );

    // 셀 → 목자 이름
    const leaderByCell: Record<string, string> = {};
    (leadersResult.data || []).forEach((l: any) => {
      if (l.cell_id) leaderByCell[l.cell_id] = l.name;
    });

    const toMember = (u: any): MemberProgress => ({
      id: u.id,
      name: u.name,
      role: u.role,
      isMe: u.id === session.userId,
      chaptersRead: counts[u.id] || 0,
      lastReadAt: last[u.id] || null,
    });

    const groupYear = orgResult.data as any;
    const rawVillages = ((groupYear?.villages || []) as any[])
      .filter((v: any) => canSeeAll || v.id === session.villageId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const usersByCell: Record<string, any[]> = {};
    const usersByVillageNoCell: Record<string, any[]> = {};
    const unassigned: any[] = [];
    users.forEach((u) => {
      if (u.cell_id) (usersByCell[u.cell_id] ||= []).push(u);
      else if (u.village_id) (usersByVillageNoCell[u.village_id] ||= []).push(u);
      else unassigned.push(u);
    });

    const villages = rawVillages.map((v: any) => {
      const cells = ((v.cells || []) as any[])
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((c: any) => {
          const members = (usersByCell[c.id] || []).map(toMember);
          const label = c.name || (leaderByCell[c.id] ? `${leaderByCell[c.id]} 목장` : '소그룹');
          return {
            id: c.id,
            name: label,
            members,
            totalRead: members.reduce((s, m) => s + m.chaptersRead, 0),
          };
        });

      // 마을 소속이나 소그룹 미지정
      const noCell = (usersByVillageNoCell[v.id] || []).map(toMember);
      if (noCell.length > 0) {
        cells.push({
          id: `${v.id}-nocell`,
          name: '소그룹 미지정',
          members: noCell,
          totalRead: noCell.reduce((s, m) => s + m.chaptersRead, 0),
        });
      }

      const memberCount = cells.reduce((s, c) => s + c.members.length, 0);
      return {
        id: v.id,
        name: v.name,
        cells,
        memberCount,
        totalRead: cells.reduce((s, c) => s + c.totalRead, 0),
      };
    });

    return NextResponse.json({
      scope: 'all',
      scopeLabel: canSeeAll ? '부서 전체 통독 현황' : '우리 마을 통독 현황',
      total: TOTAL_CHAPTERS,
      villages,
      unassigned: canSeeAll ? unassigned.map(toMember) : [],
    });
  }

  // ─── 일반 성도: 같은 소그룹(없으면 마을) 구성원 ───
  let membersQuery = supabase
    .from('users')
    .select('id, name, role')
    .eq('department_id', session.departmentId)
    .eq('is_graduated', false);

  if (session.cellId) membersQuery = membersQuery.eq('cell_id', session.cellId);
  else if (session.villageId) membersQuery = membersQuery.eq('village_id', session.villageId);
  else membersQuery = membersQuery.eq('id', session.userId);

  const { data: members, error } = await membersQuery;
  if (error) return NextResponse.json({ error: '구성원을 불러오지 못했습니다.' }, { status: 500 });

  const memberIds = (members || []).map((m) => m.id);
  const { counts, last } = await aggregateProgress(supabase, memberIds);

  const result: MemberProgress[] = (members || []).map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    isMe: m.id === session.userId,
    chaptersRead: counts[m.id] || 0,
    lastReadAt: last[m.id] || null,
  }));

  return NextResponse.json({ scope: 'cell', total: TOTAL_CHAPTERS, members: result });
}
