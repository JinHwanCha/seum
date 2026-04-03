'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessageSquare, Heart as HeartIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/date-utils';
import type { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
  boardType: string;
}

export function PostCard({ post, boardType }: PostCardProps) {
  const params = useParams();
  const basePath = `/${params.church}/${params.department}`;

  return (
    <Link href={`${basePath}/boards/${boardType}/${post.id}`}>
      <div className="warm-surface rounded-xl border border-stone-200/80 p-4 hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {post.is_pinned && <Badge variant="danger">고정</Badge>}
              {post.category && <Badge>{post.category.name}</Badge>}
              {post.gathering_type && <Badge variant="primary">{post.gathering_type}</Badge>}
            </div>
            <h3 className="font-medium text-stone-900 text-sm truncate">{post.title}</h3>
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">{post.content}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="font-medium text-stone-600">{post.author?.name}</span>
            <span>{formatDateTime(post.created_at)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {post._count?.comments || 0}
            </span>
            <span className="flex items-center gap-1">
              <HeartIcon size={12} />
              {post._count?.reactions || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
