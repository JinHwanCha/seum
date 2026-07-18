import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { TOTAL_CHAPTERS } from '@/lib/bible';

// 같은 소그룹(목장) 구성원들의 성경 읽기 진도 현황
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  // 같은 셀(목장)원. 셀이 없으면 같은 마을원으로 fallback.
  let membersQuery = supabase
    .from('users')
    .select('id, name, role, minister_rank')
    .eq('department_id', session.departmentId)
    .eq('is_graduated', false);

  if (session.cellId) {
    membersQuery = membersQuery.eq('cell_id', session.cellId);
  } else if (session.villageId) {
    membersQuery = membersQuery.eq('village_id', session.villageId);
  } else {
    // 소속 소그룹이 없으면 본인만
    membersQuery = membersQuery.eq('id', session.userId);
  }

  const { data: members, error: memErr } = await membersQuery;
  if (memErr) return NextResponse.json({ error: '구성원을 불러오지 못했습니다.' }, { status: 500 });

  const memberIds = (members || []).map((m) => m.id);
  if (memberIds.length === 0) {
    return NextResponse.json({ members: [], total: TOTAL_CHAPTERS });
  }

  const { data: progress, error: progErr } = await supabase
    .from('bible_reading_progress')
    .select('user_id')
    .in('user_id', memberIds);

  if (progErr) return NextResponse.json({ error: '진도를 불러오지 못했습니다.' }, { status: 500 });

  const counts: Record<string, number> = {};
  (progress || []).forEach((p) => {
    counts[p.user_id] = (counts[p.user_id] || 0) + 1;
  });

  const result = (members || [])
    .map((m) => ({
      id: m.id,
      name: m.name,
      isMe: m.id === session.userId,
      chaptersRead: counts[m.id] || 0,
    }))
    .sort((a, b) => b.chaptersRead - a.chaptersRead);

  return NextResponse.json({ members: result, total: TOTAL_CHAPTERS });
}
