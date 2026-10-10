import { createClient } from '@/lib/supabase';
import type { SessionPayload } from '@/lib/types';

export async function getSmallGroupContext(session: SessionPayload) {
  const supabase = createClient();
  const { data: user, error } = await supabase.from('users')
    .select('role, cell_id, village_id, birth_date, is_early_birth, is_approved, department_id')
    .eq('id', session.userId).eq('department_id', session.departmentId).maybeSingle();
  if (error) throw error;
  if (!user?.is_approved) throw new Error('승인된 현재 소속 정보를 확인할 수 없습니다.');
  let villageName: string | null = null;
  let isNewFamilyTeam = false;
  if (user.village_id) {
    const village = await supabase.from('villages').select('name, is_new_member_team').eq('id', user.village_id).maybeSingle();
    if (village.error) throw village.error;
    villageName = village.data?.name || null;
    isNewFamilyTeam = Boolean(village.data?.is_new_member_team);
  }
  return {
    villageName,
    currentUser: {
      role: user.role, cellId: user.cell_id, villageId: user.village_id,
      birth_date: user.birth_date, is_early_birth: user.is_early_birth, isNewFamilyTeam,
    },
  };
}

export async function getSmallGroupUserIds(session: SessionPayload, context: Awaited<ReturnType<typeof getSmallGroupContext>>) {
  if (context.currentUser.role === 'minister') return null;
  let query = createClient().from('users').select('id')
    .eq('department_id', session.departmentId).eq('is_approved', true).eq('is_graduated', false);
  if (context.currentUser.villageId && context.currentUser.cellId) {
    query = query.or(`village_id.eq.${context.currentUser.villageId},cell_id.eq.${context.currentUser.cellId}`);
  }
  else if (context.currentUser.villageId) query = query.eq('village_id', context.currentUser.villageId);
  else if (context.currentUser.cellId) query = query.eq('cell_id', context.currentUser.cellId);
  else return [session.userId];
  const { data, error } = await query;
  if (error) throw error;
  return Array.from(new Set([session.userId, ...(data || []).map((user) => user.id)]));
}
