import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canManageCategories } from '@/lib/permissions';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const boardType = searchParams.get('boardType');

  const supabase = createClient();

  let query = supabase
    .from('board_categories')
    .select('*')
    .eq('department_id', session.departmentId)
    .order('sort_order', { ascending: true });

  if (boardType) {
    query = query.eq('board_type', boardType);
  }

  const { data: categories } = await query;
  return NextResponse.json({ categories: categories || [] });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canManageCategories(session.role as any, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, boardType } = await request.json();
  if (!name || !boardType) {
    return NextResponse.json({ error: 'name and boardType required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: maxSort } = await supabase
    .from('board_categories')
    .select('sort_order')
    .eq('department_id', session.departmentId)
    .eq('board_type', boardType)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('board_categories')
    .insert({
      department_id: session.departmentId,
      board_type: boardType,
      name,
      sort_order: (maxSort?.sort_order || 0) + 1,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: '카테고리 추가에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true, category: data });
}
