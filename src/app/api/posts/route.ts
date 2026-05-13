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

  let query = supabase
    .from('posts')
    .select('*, author:users(id, name, role, minister_rank), category:board_categories(id, name), village:villages(id, name), comments(count), reactions(count)')
    .eq('department_id', session.departmentId)
    .eq('board_type', boardType)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  // Visibility 필터: 사역자/마을장은 전체, 그 외에는 (visibility='all' OR village_id = 내 마을)
  const canSeeAll = session.role === 'minister' || session.role === 'village_leader';
  if (!canSeeAll) {
    if (session.villageId) {
      query = query.or(`visibility.eq.all,village_id.eq.${session.villageId}`);
    } else {
      query = query.eq('visibility', 'all');
    }
  }

  const { data: posts } = await query;

  const postsWithCounts = (posts || []).map((post: any) => ({
    ...post,
    _count: {
      comments: (post.comments as any[])?.[0]?.count ?? 0,
      reactions: (post.reactions as any[])?.[0]?.count ?? 0,
    },
  }));

  return NextResponse.json({ posts: postsWithCounts });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, boardType, categoryId, gatheringType, images, visibility } = await request.json();

  if (!title || !content || !boardType) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
  }

  if (!canWritePost(session.role as any, boardType as BoardType, session.isBureauLeader || session.isBureauMember)) {
    return NextResponse.json({ error: '작성 권한이 없습니다.' }, { status: 403 });
  }

  // 마을공개는 본인 마을이 있을 때만 허용. 그 외는 강제 'all'
  const requestedVisibility = visibility === 'village' ? 'village' : 'all';
  const finalVisibility = requestedVisibility === 'village' && session.villageId ? 'village' : 'all';
  const finalVillageId = finalVisibility === 'village' ? session.villageId : null;

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
      images: Array.isArray(images) ? images : [],
      visibility: finalVisibility,
      village_id: finalVillageId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Post create error:', error);
    return NextResponse.json({ error: '작성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, post: data });
}
