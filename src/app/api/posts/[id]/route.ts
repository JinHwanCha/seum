import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canEditPost, canDeletePost } from '@/lib/permissions';
import type { BoardType } from '@/lib/types';
import { loadPostContent, loadPostInteractions } from '@/lib/post-detail-data';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const post = await loadPostContent(session, null, params.id);
    if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 });
    const interactions = await loadPostInteractions(post.id);
    return NextResponse.json({ post, ...interactions }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Post detail lookup failed:', error);
    return NextResponse.json({ error: '게시글 조회에 실패했습니다. 다시 시도해주세요.' }, { status: 503 });
  }
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

  const { title, content, categoryId, gatheringType, images, visibility, villageId: targetVillageId } = await request.json();

  const canPickAnyVillage = session.role === 'minister' || session.role === 'village_leader';
  let finalVisibility: 'all' | 'village' | 'pastor' = 'all';
  let finalVillageId: string | null = null;

  if (visibility === 'pastor') {
    finalVisibility = 'pastor';
  } else if (visibility === 'village') {
    const chosen = canPickAnyVillage ? targetVillageId : session.villageId;
    if (chosen) {
      finalVisibility = 'village';
      finalVillageId = chosen;
    }
  }

  const { error } = await supabase
    .from('posts')
    .update({
      title,
      content,
      category_id: categoryId || null,
      gathering_type: gatheringType || null,
      images: Array.isArray(images) ? images : [],
      visibility: finalVisibility,
      village_id: finalVillageId,
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
