import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { notifyPostAuthor } from '@/lib/notifications';
import { EMOJIS } from '@/lib/constants';

async function readEmoji(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null && 'emoji' in body &&
      typeof body.emoji === 'string' && EMOJIS.includes(body.emoji)
      ? body.emoji
      : null;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const emoji = await readEmoji(request);
  if (!emoji) return NextResponse.json({ error: '지원하는 공감 이모티콘을 선택해주세요.' }, { status: 400 });

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
    console.error('Reaction insert failed:', error);
    return NextResponse.json({ error: '반응 추가에 실패했습니다.' }, { status: 500 });
  }

  await notifyPostAuthor(supabase, {
    postId: params.id,
    actorId: session.userId,
    actorName: session.name,
    type: 'reaction',
    snippet: emoji,
  }).catch((error: unknown) => {
    console.error('Reaction saved but author notification failed:', error);
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const emoji = await readEmoji(request);
  if (!emoji) return NextResponse.json({ error: '지원하는 공감 이모티콘을 선택해주세요.' }, { status: 400 });

  const supabase = createClient();

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('post_id', params.id)
    .eq('user_id', session.userId)
    .eq('emoji', emoji);

  if (error) {
    console.error('Reaction delete failed:', error);
    return NextResponse.json({ error: '반응 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
