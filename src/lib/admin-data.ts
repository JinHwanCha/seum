import { createClient } from '@/lib/supabase';
import type { SessionPayload, User } from '@/lib/types';

export interface CellWithLeader {
  id: string;
  name: string;
  sort_order: number;
  village_id?: string;
  leader_name?: string | null;
}

export interface VillageWithCells {
  id: string;
  name: string;
  sort_order: number;
  cells: CellWithLeader[];
}

export async function getVillagesWithCells(session: SessionPayload): Promise<VillageWithCells[]> {
  const supabase = createClient();

  const [orgResult, cellLeadersResult] = await Promise.all([
    supabase
      .from('group_years')
      .select('id, villages(id, name, sort_order, cells(id, name, sort_order))')
      .eq('department_id', session.departmentId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('users')
      .select('id, name, cell_id')
      .eq('department_id', session.departmentId)
      .eq('role', 'cell_leader')
      .eq('is_approved', true),
  ]);

  const groupYear = orgResult.data as any;
  if (!groupYear) return [];

  const leaderByCell: Record<string, string> = {};
  ((cellLeadersResult.data || []) as any[]).forEach((u: any) => {
    if (u.cell_id) leaderByCell[u.cell_id] = u.name;
  });

  return ((groupYear.villages || []) as any[])
    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((v: any) => ({
      ...v,
      cells: ((v.cells || []) as any[])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((c: any) => ({ ...c, village_id: v.id, leader_name: leaderByCell[c.id] || null })),
    }));
}

export async function getMembers(
  session: SessionPayload,
  status: 'pending' | 'graduated' | 'all'
): Promise<User[]> {
  const supabase = createClient();

  let query = supabase
    .from('users')
    .select(
      'id, name, birth_date, phone, role, minister_rank, village_id, cell_id, is_approved, is_admin, is_graduated, graduated_at, created_at'
    )
    .eq('department_id', session.departmentId)
    .order('created_at', { ascending: false });

  if (status === 'pending') {
    query = query.eq('is_approved', false).eq('role', 'pending');
  } else if (status === 'graduated') {
    query = query.eq('is_graduated', true);
  } else {
    query = query.eq('is_approved', true).eq('is_graduated', false);
  }

  const { data } = await query;
  return (data as unknown as User[]) || [];
}

export async function getResetRequests(session: SessionPayload) {
  const supabase = createClient();
  const { data } = await supabase
    .from('password_reset_requests')
    .select('*, user:users(id, name, phone)')
    .eq('church_id', session.churchId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  return data || [];
}
