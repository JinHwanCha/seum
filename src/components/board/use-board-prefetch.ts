'use client';

import { useCallback } from 'react';
import { useSWRConfig, unstable_serialize } from 'swr';
import { useAuth } from '@/hooks/use-auth';
import { boardCacheKey, boardCacheUsable, fetchBoard, type CachedBoardPayload } from '@/lib/board-cache';

const pendingByCache = new WeakMap<object, Set<string>>();

export function useBoardPrefetch() {
  const { user } = useAuth();
  const { cache, mutate } = useSWRConfig();
  return useCallback((href: unknown) => {
    if (!user || user.requiresGroupSelection || typeof href !== 'string') return;
    const base = `/${user.churchSlug}/${user.departmentSlug}/boards/`;
    if (!href.startsWith(base)) return;
    const type = href.slice(base.length);
    if (!['notice', 'sharing', 'gathering', 'intercession'].includes(type)) return;
    const key = boardCacheKey(user, type);
    const serialized = unstable_serialize(key);
    const entry = cache.get(serialized);
    if (entry?.isValidating || boardCacheUsable(entry?.data as CachedBoardPayload | undefined)) return;
    let pending = pendingByCache.get(cache);
    if (!pending) { pending = new Set(); pendingByCache.set(cache, pending); }
    if (pending.has(serialized)) return;
    pending.add(serialized);
    mutate(key, fetchBoard(key), { revalidate: false }).catch((error: unknown) =>
      console.error('Board navigation preload failed:', error)
    ).finally(() => pending.delete(serialized));
  }, [user, cache, mutate]);
}
