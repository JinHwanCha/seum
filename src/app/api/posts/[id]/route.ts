import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canEditPost, canDeletePost } from '@/lib/permissions';
import type { BoardType } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  const { data: post } = await supabase
    .from('posts')
    .select(`
      *,
      author:users(id, name, role, minister_rank),
      category:board_categories(id, name)
    `)
    .eq('id', params.id)
    .single();

  if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });

  const [{ data: comments }, { data: reactions }] = await Promise.all([
    supabase
      .from('comments')
      .select('*, author:users(id, name, role, minister_rank)')
      .eq('post_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('reactions')
      .select('*')
      .eq('post_id', params.id),
  ]);

  return NextResponse.json({
    post,
    comments: comments || [],
    reactions: reactions || [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  const { data: post } = await supabase
    .from('posts')
    .select('author_id, board_type')
    .eq('id', params.id)
    .single();

  if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });

  const isAuthor = post.author_id === session.userId;
  if (!canEditPost(session.role as any, isAuthor)) {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
  }

  const { title, content, categoryId, gatheringType } = await request.json();

  const { error } = await supabase
    .from('posts')
    .update({
      title,
      content,
      category_id: categoryId || null,
      gathering_type: gatheringType || null,
      updated_at: new Date().toISOString(),
    })
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

  const { data: post } = await supabase
    .from('posts')
    .select('author_id, board_type')
    .eq('id', params.id)
    .single();

  if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });

  const isAuthor = post.author_id === session.userId;
  if (!canDeletePost(session.role as any, post.board_type as BoardType, isAuthor)) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  const { error } = await supabase.from('posts').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
