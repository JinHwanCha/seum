import { createClient } from '@/lib/supabase';
import { loadBoardPosts } from '@/lib/posts-data';
import type { BoardPayload } from '@/lib/board-cache';
import type { SessionPayload } from '@/lib/types';

export async function loadBoardData(session: SessionPayload, type: string): Promise<BoardPayload> {
  const supabase = createClient();
  const [groups, categories, result] = await Promise.all([
    supabase.from('group_years').select('villages(id, name, sort_order)')
      .eq('department_id', session.departmentId).eq('is_active', true).maybeSingle(),
    supabase.from('board_categories').select('id, name, sort_order')
      .eq('department_id', session.departmentId).eq('board_type', type).order('sort_order'),
    loadBoardPosts({
      departmentId: session.departmentId, boardType: type,
      canSeeAll: session.role === 'minister' || session.role === 'village_leader',
      villageId: session.villageId ?? null,
    }),
  ]);
  if (groups.error) throw groups.error;
  if (categories.error) throw categories.error;
  const villages = (groups.data?.villages || []).slice().sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, name }) => ({ id, name }));
  return {
    ...result, villages,
    categories: (categories.data || []).map(({ id, name }) => ({ id, name })),
    villageMap: Object.fromEntries(villages.map((village) => [village.id, village.name])),
  };
}
