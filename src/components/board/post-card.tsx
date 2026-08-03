'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessageSquare, Heart as HeartIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/date-utils';
import { birthYearTag } from '@/lib/utils';
import type { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
  boardType: string;
  villageMap?: Record<string, string>;
}

export function PostCard({ post, boardType, villageMap = {} }: PostCardProps) {
  const params = useParams();
  const basePath = `/${params.church}/${params.department}`;
  const firstImage = post.images && post.images.length > 0 ? post.images[0] : null;
  const totalImages = (post as any)._imageCount ?? (post.images?.length ?? 0);
  const extraCount = totalImages > 1 ? totalImages - 1 : 0;
  const authorVillageName = villageMap[(post.author as any)?.village_id] || null;

  return (
    <Link href={`${basePath}/boards/${boardType}/${post.id}`} className="block">
      <div className="warm-surface rounded-xl border border-stone-200/80 p-4 hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {post.is_pinned && <Badge variant="danger">고정</Badge>}
              {post.category && <Badge>{post.category.name}</Badge>}
              {post.gathering_type && <Badge variant="primary">{post.gathering_type}</Badge>}
              {post.visibility === 'village' && post.village && (
                <Badge variant="warning">🏘 {post.village.name}</Badge>
              )}
              {post.visibility === 'pastor' && (
                <Badge variant="primary">⛪ 목사님</Badge>
              )}
            </div>
            <h3 className="font-medium text-stone-900 text-sm truncate">{post.title}</h3>
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">{post.content}</p>
          </div>
          {firstImage && (
            <div className="relative shrink-0 h-14 w-14 rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={firstImage} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              {extraCount > 0 && (
                <span className="absolute bottom-0 right-0 bg-stone-900/70 text-white text-[10px] px-1 rounded-tl-md">
                  +{extraCount}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-stone-100">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-xs text-stone-400">
            {authorVillageName && (
              <span className="inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md bg-primary-50 text-primary-700 text-[10px] font-medium border border-primary-100 whitespace-nowrap">
                {authorVillageName}
              </span>
            )}
            <span className="font-medium text-stone-600 whitespace-nowrap">
              {post.author?.name}
              {birthYearTag((post.author as any)?.birth_date)}
            </span>
            <span className="whitespace-nowrap">{formatDateTime(post.created_at)}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs text-stone-400">
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
