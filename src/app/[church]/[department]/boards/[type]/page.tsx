import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canWritePost } from '@/lib/permissions';
import { loadBoardPosts } from '@/lib/posts-data';
import { PostList } from '@/components/board/post-list';
import { Button } from '@/components/ui/button';
import { BOARD_TYPE_LABELS } from '@/lib/constants';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { BoardType } from '@/lib/types';

interface PageProps {
  params: { church: string; department: string; type: string };
}

async function PostListServer({
  departmentId,
  type,
  villageId,
  canSeeAll,
}: {
  departmentId: string;
  type: string;
  villageId: string | null;
  canSeeAll: boolean;
}) {
  const supabase = createClient();

  // 1) 현재 활성 group_year 의 마을 목록 (탭용)
  const { data: groupYear } = await supabase
    .from('group_years')
    .select('villages(id, name, sort_order)')
    .eq('department_id', departmentId)
    .eq('is_active', true)
    .single();

  const villages = (((groupYear as any)?.villages || []) as { id: string; name: string; sort_order: number }[])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // 1-2) 게시판 카테고리 목록 (카테고리 탭용)
  const { data: categoryRows } = await supabase
    .from('board_categories')
    .select('id, name, sort_order')
    .eq('department_id', departmentId)
    .eq('board_type', type)
    .order('sort_order', { ascending: true });

  const categories = ((categoryRows || []) as { id: string; name: string }[]).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  // 2) 게시글 (가시성 필터 + 첫 페이지만) — 목록은 썸네일만 조회해 페이로드 최소화
  const { posts: enrichedPosts, hasMore } = await loadBoardPosts({
    departmentId,
    boardType: type,
    canSeeAll,
    villageId,
  });

  // 서버에서 id→이름 맵 생성—클라이언트 추가 쿼리 없이 작성자 마을명 표기 용
  const villageMap: Record<string, string> = {};
  villages.forEach((v) => { villageMap[v.id] = v.name; });

  return (
    <PostList
      posts={enrichedPosts}
      boardType={type}
      villages={villages}
      categories={categories}
      villageMap={villageMap}
      currentVillageId={villageId}
      canSeeAll={canSeeAll}
      initialHasMore={hasMore}
    />
  );
}

function PostListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-20 bg-stone-100 rounded-xl" />
      ))}
    </div>
  );
}

export default async function BoardListPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const canWrite = canWritePost(
    session.role as any,
    params.type as BoardType,
    session.isBureauLeader || session.isBureauMember
  );

  const basePath = `/${params.church}/${params.department}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-900">
          {BOARD_TYPE_LABELS[params.type] || params.type}
        </h1>
        {canWrite && (
          <Link href={`${basePath}/boards/${params.type}/new`}>
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              글쓰기
            </Button>
          </Link>
        )}
      </div>
      <Suspense fallback={<PostListSkeleton />}>
        <PostListServer
          departmentId={session.departmentId}
          type={params.type}
          villageId={session.villageId ?? null}
          canSeeAll={session.role === 'minister' || session.role === 'village_leader'}
        />
      </Suspense>
    </div>
  );
}

