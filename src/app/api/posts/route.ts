import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canWritePost } from '@/lib/permissions';
import type { BoardType } from '@/lib/types';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const boardType = searchParams.get('boardType');
  if (!boardType) return NextResponse.json({ error: 'boardType required' }, { status: 400 });

  const supabase = createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:users(id, name, role, minister_rank),
      category:board_categories(id, name)
    `)
    .eq('department_id', session.departmentId)
    .eq('board_type', boardType)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  // Get counts
  const postsWithCounts = await Promise.all(
    (posts || []).map(async (post) => {
      const [{ count: commentCount }, { count: reactionCount }] = await Promise.all([
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
        supabase.from('reactions').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
      ]);
      return {
        ...post,
        _count: { comments: commentCount || 0, reactions: reactionCount || 0 },
      };
    })
  );

  return NextResponse.json({ posts: postsWithCounts });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, boardType, categoryId, gatheringType } = await request.json();

  if (!title || !content || !boardType) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
  }

  if (!canWritePost(session.role as any, boardType as BoardType, session.isBureauLeader || session.isBureauMember)) {
    return NextResponse.json({ error: '작성 권한이 없습니다.' }, { status: 403 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('posts')
    .insert({
      department_id: session.departmentId,
      board_type: boardType,
      category_id: categoryId || null,
      author_id: session.userId,
      title,
      content,
      gathering_type: gatheringType || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Post create error:', error);
    return NextResponse.json({ error: '작성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, post: data });
}
