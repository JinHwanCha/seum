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

async function PostListServer({ departmentId, type }: { departmentId: string; type: string }) {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:users(id, name, role, minister_rank), category:board_categories(id, name), comments(count), reactions(count)')
    .eq('department_id', departmentId)
    .eq('board_type', type)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  const enrichedPosts = (posts || []).map((post: any) => ({
    ...post,
    _count: {
      comments: (post.comments as any[])?.[0]?.count ?? 0,
      reactions: (post.reactions as any[])?.[0]?.count ?? 0,
    },
  }));

  return <PostList posts={enrichedPosts} boardType={type} />;
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
        <PostListServer departmentId={session.departmentId} type={params.type} />
      </Suspense>
    </div>
  );
}

