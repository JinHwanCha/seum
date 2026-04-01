import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  const { data: groupYears } = await supabase
    .from('group_years')
    .select('*')
    .eq('department_id', session.departmentId)
    .order('year', { ascending: false });

  return NextResponse.json({ groupYears: groupYears || [] });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'minister') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { year } = await request.json();
  if (!year) return NextResponse.json({ error: 'year required' }, { status: 400 });

  const supabase = createClient();

  // Deactivate previous years
  await supabase
    .from('group_years')
    .update({ is_active: false })
    .eq('department_id', session.departmentId);

  const { data, error } = await supabase
    .from('group_years')
    .insert({
      department_id: session.departmentId,
      year,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 연도입니다.' }, { status: 400 });
    }
    return NextResponse.json({ error: '생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, groupYear: data });
}
