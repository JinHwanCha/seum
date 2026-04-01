'use client';

import { PostCard } from './post-card';
import type { Post } from '@/lib/types';

interface PostListProps {
  posts: Post[];
  boardType: string;
}

export function PostList({ posts, boardType }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">게시글이 없습니다.</p>
      </div>
    );
  }

  // Show pinned posts first
  const pinned = posts.filter((p) => p.is_pinned);
  const regular = posts.filter((p) => !p.is_pinned);

  return (
    <div className="space-y-3">
      {pinned.map((post) => (
        <PostCard key={post.id} post={post} boardType={boardType} />
      ))}
      {regular.map((post) => (
        <PostCard key={post.id} post={post} boardType={boardType} />
      ))}
    </div>
  );
}
