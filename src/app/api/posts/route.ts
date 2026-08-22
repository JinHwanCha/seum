import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canWritePost, isMinister } from '@/lib/permissions';
import { broadcastAnnouncement } from '@/lib/notifications';
import { loadBoardPosts, POSTS_PAGE_SIZE } from '@/lib/posts-data';
import type { BoardType, Role } from '@/lib/types';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const boardType = searchParams.get('boardType');
  if (!boardType) return NextResponse.json({ error: 'boardType required' }, { status: 400 });

  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);
  const limit = Math.min(50, parseInt(searchParams.get('limit') || String(POSTS_PAGE_SIZE), 10) || POSTS_PAGE_SIZE);

  const canSeeAll = session.role === 'minister' || session.role === 'village_leader';

  const { posts, hasMore } = await loadBoardPosts({
    departmentId: session.departmentId,
    boardType,
    canSeeAll,
    villageId: session.villageId ?? null,
    limit,
    offset,
  });

  return NextResponse.json({ posts, hasMore });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, content, boardType, categoryId, gatheringType, images, visibility, villageId: targetVillageId, notifyAll } = await request.json();

  if (!title || !content || !boardType) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 });
  }

  if (!canWritePost(session.role as any, boardType as BoardType, session.isBureauLeader || session.isBureauMember)) {
    return NextResponse.json({ error: '작성 권한이 없습니다.' }, { status: 403 });
  }

  // 가시성 결정 — 권한 위조 방지
  const canPickAnyVillage = session.role === 'minister' || session.role === 'village_leader';
  let finalVisibility: 'all' | 'village' | 'pastor' = 'all';
  let finalVillageId: string | null = null;

  if (visibility === 'pastor') {
    finalVisibility = 'pastor';
  } else if (visibility === 'village') {
    // 사역자/마을장은 임의 마을 지정 가능, 그 외는 본인 마을로 강제
    const chosen = canPickAnyVillage ? targetVillageId : session.villageId;
    if (chosen) {
      finalVisibility = 'village';
      finalVillageId = chosen;
    }
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

  // 공지 '모두에게 알림' — 사역자만, 부서 전원에게 방송 알림 생성
  if (notifyAll && boardType === 'notice' && isMinister(session.role as Role)) {
    await broadcastAnnouncement(supabase, {
      departmentId: session.departmentId,
      actorId: session.userId,
      postId: data.id,
      title,
      body: content,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, post: data });
}
