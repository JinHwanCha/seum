'use client';

import { useCallback } from 'react';
import { unstable_serialize, useSWRConfig } from 'swr';
import { useAuth } from '@/hooks/use-auth';
import { formatWeekDate, isFutureWeek } from '@/lib/date-utils';
import { fetchSmallGroup, smallGroupCacheKey } from '@/lib/small-group-cache';

const pendingByCache = new WeakMap<object, Set<string>>();

export function useWeekPrefetch(assignment: string) {
  const { user } = useAuth();
  const { cache, mutate } = useSWRConfig();
  return useCallback((sunday: Date, mode: 'prayer' | 'attendance' | 'both' = 'both') => {
    if (!user || !assignment || user.requiresGroupSelection || isFutureWeek(sunday)) return;
    const week = formatWeekDate(sunday);
    const urls = [
      ...(mode !== 'attendance' ? [`/api/small-group?weekStart=${week}&mode=prayer`] : []),
      ...(mode !== 'prayer' ? [`/api/small-group?weekStart=${week}&attendanceOnly=true`] : []),
    ];
    let pending = pendingByCache.get(cache);
    if (!pending) { pending = new Set(); pendingByCache.set(cache, pending); }
    for (const url of urls) {
      const key = smallGroupCacheKey(user, url, assignment);
      const serialized = unstable_serialize(key);
      const entry = cache.get(serialized);
      const cached = entry?.data as { fetchedAt?: number } | undefined;
      if (cached?.fetchedAt && Date.now() - cached.fetchedAt < 5 * 60 * 1000) continue;
      if (entry?.isValidating || pending.has(serialized)) continue;
      pending.add(serialized);
      mutate(key, fetchSmallGroup(key), { revalidate: false }).catch((error: unknown) =>
        console.error('Adjacent week preparation failed:', error)
      ).finally(() => pending.delete(serialized));
    }
  }, [user, assignment, cache, mutate]);
}
