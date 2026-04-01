import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'minister') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { villageId, name } = await request.json();
  if (!villageId) return NextResponse.json({ error: 'villageId required' }, { status: 400 });

  const supabase = createClient();

  // Get max sort order for this village
  const { data: maxSort } = await supabase
    .from('cells')
    .select('sort_order')
    .eq('village_id', villageId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('cells')
    .insert({
      village_id: villageId,
      name: name || null,
      sort_order: (maxSort?.sort_order || 0) + 1,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: '소그룹 추가에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true, cell: data });
}
