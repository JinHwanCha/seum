import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canApproveMembers } from '@/lib/permissions';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const supabase = createClient();

  let query = supabase
    .from('users')
    .select('id, name, birth_date, phone, role, minister_rank, village_id, cell_id, is_approved, is_admin, created_at')
    .eq('department_id', session.departmentId)
    .order('created_at', { ascending: false });

  if (status === 'pending') {
    query = query.eq('is_approved', false).eq('role', 'pending');
  } else {
    query = query.eq('is_approved', true);
  }

  const { data: members } = await query;
  return NextResponse.json({ members: members || [] });
}
