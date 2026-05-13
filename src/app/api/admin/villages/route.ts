import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  // groupYear(villages+cells 내장) + cell leaders 동시 조회 — 3단계 워터폴 → 2단계 병렬
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
  if (!groupYear) return NextResponse.json({ villages: [] });

  const leaderByCell: Record<string, string> = {};
  ((cellLeadersResult.data || []) as any[]).forEach((u: any) => {
    if (u.cell_id) leaderByCell[u.cell_id] = u.name;
  });

  const villages = ((groupYear.villages || []) as any[])
    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((v: any) => ({
      ...v,
      cells: ((v.cells || []) as any[])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((c: any) => ({ ...c, leader_name: leaderByCell[c.id] || null })),
    }));

  return NextResponse.json({ villages });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'minister') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const supabase = createClient();

  // Get active group year
  const { data: groupYear } = await supabase
    .from('group_years')
    .select('id')
    .eq('department_id', session.departmentId)
    .eq('is_active', true)
    .single();

  if (!groupYear) {
    return NextResponse.json({ error: '활성화된 연도가 없습니다.' }, { status: 400 });
  }

  // Get max sort order
  const { data: maxSort } = await supabase
    .from('villages')
    .select('sort_order')
    .eq('group_year_id', groupYear.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('villages')
    .insert({
      group_year_id: groupYear.id,
      name,
      sort_order: (maxSort?.sort_order || 0) + 1,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: '마을 추가에 실패했습니다.' }, { status: 500 });
  revalidatePath('/', 'layout');
  return NextResponse.json({ success: true, village: data });
}
