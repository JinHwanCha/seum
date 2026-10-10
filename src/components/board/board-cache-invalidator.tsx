'use client';

import { useEffect } from 'react';
import { useSWRConfig, unstable_serialize } from 'swr';
import { BOARD_CHANGED_EVENT, updateBoardSnapshot, type BoardChange, type CachedBoardPayload } from '@/lib/board-cache';
import { useAuth } from '@/hooks/use-auth';

export function BoardCacheInvalidator() {
  const { mutate, cache } = useSWRConfig();
  const { user } = useAuth();
  const userId = user?.userId;
  useEffect(() => {
    if (!userId) return;
    const invalidate = (event: Event) => {
      const change = event && 'detail' in event ? event.detail as BoardChange | undefined : undefined;
      mutate(
        (key) => {
          if (!Array.isArray(key) || key[0] !== 'seum-board-v1' || key[1] !== userId) return false;
          if (!change) return true;
          const data = cache.get(unstable_serialize(key))?.data as CachedBoardPayload | undefined;
          return Boolean(data?.posts.some((post) => post.id === change.postId));
        },
        (data: CachedBoardPayload | undefined) => updateBoardSnapshot(data, change),
        { revalidate: true }
      ).catch((error: unknown) => console.error('Board cache invalidation failed:', error));
    };
    window.addEventListener(BOARD_CHANGED_EVENT, invalidate);
    return () => window.removeEventListener(BOARD_CHANGED_EVENT, invalidate);
  }, [mutate, cache, userId]);
  return null;
}
