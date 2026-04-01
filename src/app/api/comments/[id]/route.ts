import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canEditComment, canDeleteComment } from '@/lib/permissions';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  const { data: comment } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', params.id)
    .single();

  if (!comment) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });

  const isAuthor = comment.author_id === session.userId;
  if (!canEditComment(isAuthor)) {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
  }

  const { content } = await request.json();

  const { error } = await supabase
    .from('comments')
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

  const { data: comment } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', params.id)
    .single();

  if (!comment) return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 });

  const isAuthor = comment.author_id === session.userId;
  if (!canDeleteComment(session.role as any, isAuthor)) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  const { error } = await supabase.from('comments').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
