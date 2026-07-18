import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canAccessAdmin } from '@/lib/permissions';
import type { Role } from '@/lib/types';

interface StatCounts {
  memberCount: number;
  onsite: number; // 1/2/3부
  online: number; // 온라인
  departmentMeeting: number;
  smallGroup: number;
  checked: number; // 출석 기록이 하나라도 있는 인원
}

function emptyCounts(): StatCounts {
  return { memberCount: 0, onsite: 0, online: 0, departmentMeeting: 0, smallGroup: 0, checked: 0 };
}

// GET: 특정 주(weekStart)의 출석 통계 (부서 전체 + 마을/소그룹별)
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = canAccessAdmin(
    session.role as Role,
    session.isBureauLeader || session.isBureauMember,
    session.isAdmin
  );
  if (!hasAccess) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let weekStart = searchParams.get('weekStart');
  if (!weekStart) {
    // 기본값: 이번 주 일요일
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    weekStart = sunday.toISOString().split('T')[0];
  }

  const supabase = createClient();

  // 조직 구조 + 구성원 병렬 조회
  const [{ data: groupYear }, { data: members }] = await Promise.all([
    supabase
      .from('group_years')
      .select('id, villages(id, name, sort_order, cells(id, name, sort_order))')
      .eq('department_id', session.departmentId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('users')
      .select('id, name, village_id, cell_id')
      .eq('department_id', session.departmentId)
      .eq('is_approved', true)
      .eq('is_graduated', false),
  ]);

  const memberList = (members || []) as any[];
  const memberIds = memberList.map((m) => m.id);

  // 해당 주 출석 데이터
  const attByUser: Record<string, any> = {};
  if (memberIds.length > 0) {
    const { data: attendance } = await supabase
      .from('attendance')
      .select('user_id, worship_service, department_meeting, small_group')
      .eq('week_start', weekStart)
      .in('user_id', memberIds);
    (attendance || []).forEach((a) => {
      attByUser[a.user_id] = a;
    });
  }

  const accumulate = (counts: StatCounts, userId: string) => {
    counts.memberCount += 1;
    const a = attByUser[userId];
    if (!a) return;
    let touched = false;
    if (a.worship_service === '온라인') {
      counts.online += 1;
      touched = true;
    } else if (a.worship_service === '1부' || a.worship_service === '2부' || a.worship_service === '3부') {
      counts.onsite += 1;
      touched = true;
    }
    if (a.department_meeting) {
      counts.departmentMeeting += 1;
      touched = true;
    }
    if (a.small_group) {
      counts.smallGroup += 1;
      touched = true;
    }
    if (touched) counts.checked += 1;
  };

  // 마을/소그룹별 집계
  const rawVillages = (((groupYear as any)?.villages || []) as any[]).sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const membersByCell: Record<string, any[]> = {};
  const membersByVillageNoCell: Record<string, any[]> = {};
  memberList.forEach((m) => {
    if (m.cell_id) (membersByCell[m.cell_id] ||= []).push(m);
    else if (m.village_id) (membersByVillageNoCell[m.village_id] ||= []).push(m);
  });

  const summary = emptyCounts();
  memberList.forEach((m) => accumulate(summary, m.id));

  const villages = rawVillages.map((v: any) => {
    const villageCounts = emptyCounts();
    const cells = ((v.cells || []) as any[])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((c: any) => {
        const counts = emptyCounts();
        (membersByCell[c.id] || []).forEach((m) => {
          accumulate(counts, m.id);
          accumulate(villageCounts, m.id);
        });
        return { id: c.id, name: c.name || '소그룹', ...counts };
      });

    const noCell = membersByVillageNoCell[v.id] || [];
    if (noCell.length > 0) {
      const counts = emptyCounts();
      noCell.forEach((m) => {
        accumulate(counts, m.id);
        accumulate(villageCounts, m.id);
      });
      cells.push({ id: `${v.id}-nocell`, name: '소그룹 미지정', ...counts });
    }

    return { id: v.id, name: v.name, ...villageCounts, cells };
  });

  return NextResponse.json({ weekStart, summary, villages });
}
