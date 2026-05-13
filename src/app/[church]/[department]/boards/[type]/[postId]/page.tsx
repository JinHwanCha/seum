import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import PostDetailClient from './post-detail-client';

interface PageProps {
  params: { church: string; department: string; type: string; postId: string };
}

export default async function PostDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const supabase = createClient();

  // 단일 쿼리로 post + author + category + comments + reactions 모두 가져오기
  const { data: post } = await supabase
    .from('posts')
    .select(`
      *,
      author:users(id, name, role, minister_rank),
      category:board_categories(id, name),
      comments(*, author:users(id, name, role, minister_rank)),
      reactions(*)
    `)
    .eq('id', params.postId)
    .single();

  if (!post) notFound();

  const comments = ((post.comments || []) as any[])
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const reactions = (post.reactions || []) as any[];
  const basePath = `/${params.church}/${params.department}`;

  return (
    <PostDetailClient
      basePath={basePath}
      boardType={params.type}
      postId={params.postId}
      user={session}
      post={post}
      comments={comments}
      reactions={reactions}
    />
  );
}
