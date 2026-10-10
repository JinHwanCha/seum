'use client';

import { useRouter } from 'next/navigation';
import { CommentSection } from '@/components/board/comment-section';
import { ReactionBar } from '@/components/board/reaction-bar';
import type { Comment, Reaction, SessionPayload } from '@/lib/types';

export function PostInteractions({ postId, user, comments, reactions }: {
  postId: string; user: SessionPayload; comments: Comment[]; reactions: Reaction[];
}) {
  const router = useRouter();
  return (
    <>
      <div className="border-t border-stone-100 pt-4 mb-4">
        <ReactionBar key={`${postId}:${user.userId}`} postId={postId} reactions={reactions} session={user} />
      </div>
      <div className="border-t border-stone-100 pt-4">
        <CommentSection postId={postId} comments={comments} session={user} onRefresh={() => router.refresh()} />
      </div>
    </>
  );
}
