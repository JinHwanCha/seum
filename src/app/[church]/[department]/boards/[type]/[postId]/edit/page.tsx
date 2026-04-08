'use client';

import { useParams } from 'next/navigation';
import { PostForm } from '@/components/board/post-form';
import { Card, CardTitle } from '@/components/ui/card';
import { BOARD_TYPE_LABELS } from '@/lib/constants';
import useSWR from 'swr';

export default function EditPostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const boardType = params.type as string;

  const { data, isLoading } = useSWR(`/api/posts/${postId}`);
  const post = data?.post ?? null;

  if (isLoading) return <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>;
  if (!post) return <div className="text-center py-8 text-stone-400 text-sm">게시글을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardTitle>{BOARD_TYPE_LABELS[boardType] || boardType} 수정</CardTitle>
        <PostForm boardType={boardType} existingPost={post} />
      </Card>
    </div>
  );
}
