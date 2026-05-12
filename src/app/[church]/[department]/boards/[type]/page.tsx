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

export default async function BoardListPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const supabase = createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:users(id, name, role, minister_rank), category:board_categories(id, name)')
    .eq('department_id', session.departmentId)
    .eq('board_type', params.type)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  const postIds = (posts || []).map((p) => p.id);
  let commentCounts: Record<string, number> = {};
  let reactionCounts: Record<string, number> = {};

  if (postIds.length > 0) {
    const [{ data: comments }, { data: reactions }] = await Promise.all([
      supabase.from('comments').select('post_id').in('post_id', postIds),
      supabase.from('reactions').select('post_id').in('post_id', postIds),
    ]);
    (comments || []).forEach((c) => {
      commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
    });
    (reactions || []).forEach((r) => {
      reactionCounts[r.post_id] = (reactionCounts[r.post_id] || 0) + 1;
    });
  }

  const enrichedPosts = (posts || []).map((post) => ({
    ...post,
    _count: {
      comments: commentCounts[post.id] || 0,
      reactions: reactionCounts[post.id] || 0,
    },
  }));

  const canWrite = canWritePost(
    session.role as any,
    params.type as BoardType,
    session.isBureauLeader || session.isBureauMember
  );

  const basePath = `/${params.church}/${params.department}`;

  return (
    <div className="space-y-4">
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
      <PostList posts={enrichedPosts} boardType={params.type} />
    </div>
  );
}
