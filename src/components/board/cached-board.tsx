'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/hooks/use-auth';
import { boardCacheKey, boardCacheUsable, fetchBoard } from '@/lib/board-cache';
import { PostList } from '@/components/board/post-list';
import { PagePending } from '@/components/ui/page-pending';

export function CachedBoard({ boardType }: { boardType: string }) {
  const { user } = useAuth();
  const key = user && !user.requiresGroupSelection ? boardCacheKey(user, boardType) : null;
  const { data, error, mutate } = useSWR(key, fetchBoard, {
    keepPreviousData: false,
    revalidateOnMount: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000,
    refreshInterval: 60000,
  });

  useEffect(() => {
    const changed = () => {
      mutate().catch((cause: unknown) => console.error('Board cache refresh failed:', cause));
    };
    window.addEventListener('seum-notifications-changed', changed);
    return () => {
      window.removeEventListener('seum-notifications-changed', changed);
    };
  }, [mutate]);

  const visible = boardCacheUsable(data) ? data : undefined;
  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-red-600">
        {error instanceof Error ? error.message : '게시판 조회에 실패했습니다.'}
        <button className="ml-3 underline" onClick={() => {
          mutate().catch((cause: unknown) => console.error('Board retry failed:', cause));
        }}>다시 시도</button>
      </p>}
      {visible ? (
        <PostList key={key?.join(':')} posts={visible.posts} boardType={boardType}
          villages={visible.villages} categories={visible.categories} villageMap={visible.villageMap}
          initialHasMore={visible.hasMore} />
      ) : !error ? (
        <PagePending />
      ) : null}
    </div>
  );
}
