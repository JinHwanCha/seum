import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canWritePost } from '@/lib/permissions';
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

  // 2) 게시글 (가시성 필터 포함)
  let query = supabase
    .from('posts')
    .select('*, author:users(id, name, role, minister_rank, village_id), category:board_categories(id, name), village:villages(id, name), comments(count), reactions(count)')
    .eq('department_id', departmentId)
    .eq('board_type', type)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (!canSeeAll) {
    if (villageId) {
      query = query.or(`visibility.eq.all,village_id.eq.${villageId}`);
    } else {
      query = query.eq('visibility', 'all');
    }
  }

  const { data: posts } = await query;

  const enrichedPosts = (posts || []).map((post: any) => ({
    ...post,
    _count: {
      comments: (post.comments as any[])?.[0]?.count ?? 0,
      reactions: (post.reactions as any[])?.[0]?.count ?? 0,
    },
  }));

  return (
    <PostList
      posts={enrichedPosts}
      boardType={type}
      villages={villages}
      currentVillageId={villageId}
      canSeeAll={canSeeAll}
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

