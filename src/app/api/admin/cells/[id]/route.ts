import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'minister') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name } = await request.json();
  const supabase = createClient();

  const { error } = await supabase
    .from('cells')
    .update({ name })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role !== 'minister') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient();

  // Unassign users from this cell
  await supabase
    .from('users')
    .update({ cell_id: null })
    .eq('cell_id', params.id);

  const { error } = await supabase.from('cells').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
