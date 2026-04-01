import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  // Get active group year
  const { data: groupYear } = await supabase
    .from('group_years')
    .select('id')
    .eq('department_id', session.departmentId)
    .eq('is_active', true)
    .single();

  if (!groupYear) return NextResponse.json({ villages: [] });

  // Get villages with cells
  const { data: villages } = await supabase
    .from('villages')
    .select('*, cells(*)')
    .eq('group_year_id', groupYear.id)
    .order('sort_order', { ascending: true });

  // Sort cells within each village
  const sorted = (villages || []).map((v: any) => ({
    ...v,
    cells: (v.cells || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));

  return NextResponse.json({ villages: sorted });
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
  return NextResponse.json({ success: true, village: data });
}
