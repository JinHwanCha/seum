import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { emoji } = await request.json();
  if (!emoji) return NextResponse.json({ error: 'emoji required' }, { status: 400 });

  const supabase = createClient();

  const { error } = await supabase.from('reactions').insert({
    post_id: params.id,
    user_id: session.userId,
    emoji,
  });

  if (error) {
    // Might be duplicate - ignore
    if (error.code === '23505') {
      return NextResponse.json({ success: true, message: 'already reacted' });
    }
    return NextResponse.json({ error: '반응 추가에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { emoji } = await request.json();

  const supabase = createClient();

  await supabase
    .from('reactions')
    .delete()
    .eq('post_id', params.id)
    .eq('user_id', session.userId)
    .eq('emoji', emoji);

  return NextResponse.json({ success: true });
}
