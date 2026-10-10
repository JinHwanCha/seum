'use client';

import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { BOARD_CHANGED_EVENT, type CachedBoardPayload } from '@/lib/board-cache';
import { useAuth } from '@/hooks/use-auth';

export function BoardCacheInvalidator() {
  const { mutate } = useSWRConfig();
  const { user } = useAuth();
  const userId = user?.userId;
  useEffect(() => {
    if (!userId) return;
    const invalidate = () => {
      mutate(
        (key) => Array.isArray(key) && key[0] === 'seum-board-v1' && key[1] === userId,
        (data: CachedBoardPayload | undefined) => data ? { ...data, fetchedAt: 0 } : undefined,
        { revalidate: true }
      ).catch((error: unknown) => console.error('Board cache invalidation failed:', error));
    };
    window.addEventListener(BOARD_CHANGED_EVENT, invalidate);
    return () => window.removeEventListener(BOARD_CHANGED_EVENT, invalidate);
  }, [mutate, userId]);
  return null;
}
