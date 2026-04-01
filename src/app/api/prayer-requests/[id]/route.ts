import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content } = await request.json();
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const supabase = createClient();

  const { error } = await supabase
    .from('prayer_requests')
    .update({ content, updated_at: new Date().toISOString() })
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

  const supabase = createClient();

  const { error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
