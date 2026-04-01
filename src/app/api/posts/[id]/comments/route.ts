import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content, parentId } = await request.json();
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const supabase = createClient();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: params.id,
      parent_id: parentId || null,
      author_id: session.userId,
      content,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: '댓글 작성에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true, comment: data });
}
