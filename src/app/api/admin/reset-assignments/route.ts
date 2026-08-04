import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { isMinister } from '@/lib/permissions';

// POST: 전체 회원 마을/소그룹 배정 및 목자/마을장 임명 초기화 (사역자 제외)
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // 사역자/시스템관리자만 실행 가능
  if (!isMinister(session.role) && !session.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient();
  const now = new Date().toISOString();

  // 1) 사역자를 제외한 전체 회원의 마을/소그룹 배정 해제
  const { error: clearError } = await supabase
    .from('users')
    .update({ village_id: null, cell_id: null, updated_at: now })
    .eq('department_id', session.departmentId)
    .neq('role', 'minister');

  if (clearError) {
    return NextResponse.json({ error: '배정 초기화에 실패했습니다.' }, { status: 500 });
  }

  // 2) 목자/마을장 임명 초기화 → 목원으로 강등 (사역자는 제외)
  const { error: demoteError } = await supabase
    .from('users')
    .update({ role: 'cell_member', updated_at: now })
    .eq('department_id', session.departmentId)
    .in('role', ['cell_leader', 'village_leader']);

  if (demoteError) {
    return NextResponse.json({ error: '임명 초기화에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
