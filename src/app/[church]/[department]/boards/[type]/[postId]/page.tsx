import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { loadPostContent, loadPostInteractions } from '@/lib/post-detail-data';
import { PostInteractions } from '@/components/board/post-interactions';
import { PagePending } from '@/components/ui/page-pending';
import type { SessionPayload } from '@/lib/types';
import PostDetailClient from './post-detail-client';

interface PageProps {
  params: { church: string; department: string; type: string; postId: string };
}

async function Interactions({ postId, user }: { postId: string; user: SessionPayload }) {
  try {
    const data = await loadPostInteractions(postId);
    return <PostInteractions postId={postId} user={user} {...data} />;
  } catch (error) {
    console.error('Post interactions load failed:', error);
    return <p role="alert" className="text-sm text-red-600">댓글·공감을 불러오지 못했습니다. 페이지를 다시 열어주세요.</p>;
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');
  const post = await loadPostContent(session, params.type, params.postId);
  if (!post) notFound();
  return (
    <PostDetailClient basePath={`/${params.church}/${params.department}`}
      boardType={params.type} postId={post.id} postSlug={post.slug ?? post.id}
      user={session} post={post}>
      <Suspense fallback={<PagePending />}>
        <Interactions postId={post.id} user={session} />
      </Suspense>
    </PostDetailClient>
  );
}
