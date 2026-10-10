'use client';

import { useEffect, useState } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { readStoredCache } from '@/lib/persistent-cache';
import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider } from '@/components/theme/theme-provider';
import type { SessionPayload } from '@/lib/types';
import { NativePushProvider } from '@/components/notifications/native-push-provider';
import { NativeSystemBars } from '@/components/theme/native-system-bars';
import { NavigationProvider } from '@/components/layout/navigation-provider';
import { BoardCacheInvalidator } from '@/components/board/board-cache-invalidator';
import { NativePullRefresh } from '@/components/layout/native-pull-refresh';

const swrFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  });

export const SWR_CACHE_PREFIX = 'seum-swr-cache:';

// SWR 캐시를 localStorage 에 유지해 재방문/새로고침 시 이전 데이터를 즉시 렌더한다.
// 이후 백그라운드 재검증으로 최신값을 반영한다. 계정이 섞이지 않도록 사용자별 키를 쓴다.
function createLocalStorageProvider() {
  // SWR Cache 는 값 타입이 any 라 map 도 any 로 맞춘다.
  return (): Map<string, any> => {
    const map = new Map<string, any>();
    return map;
  };
}

function PersistentCache({ userId }: { userId: string }) {
  const { cache, mutate } = useSWRConfig();
  useEffect(() => {
    const cacheKey = `${SWR_CACHE_PREFIX}${userId}`;
    try {
      for (const entry of readStoredCache(localStorage.getItem(cacheKey))) {
        if (cache.get(entry.key)?.data !== undefined) continue;
        // Restore through SWR after hydration, preserving keys for later invalidation.
        if (entry.originalKey !== undefined) {
          const snapshot = { ...cache.get(entry.key), _k: entry.originalKey };
          cache.set(entry.key, snapshot);
        }
        mutate(entry.key, entry.data, { revalidate: false }).catch((error: unknown) =>
          console.error('Persisted cache restore failed:', error));
      }
    } catch (error) {
      console.error('Persisted cache could not be restored:', error);
    }
    const save = () => {
      try { localStorage.setItem(cacheKey, JSON.stringify(Array.from(cache.keys()).map((key) => [key, cache.get(key)]))); }
      catch (error) { console.error('Persisted cache save failed:', error); }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cache, mutate, userId]);
  return null;
}

export function Providers({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionPayload | null;
}) {
  // provider 는 최초 1회만 초기화되므로 함수 정체성을 고정한다.
  const [provider] = useState(() =>
    createLocalStorageProvider()
  );

  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: false,
        dedupingInterval: 10000,
        keepPreviousData: true,
        provider,
      }}
    >
      {initialUser && <PersistentCache userId={initialUser.userId} />}
      <ThemeProvider>
        <NativeSystemBars />
        <AuthProvider initialUser={initialUser}>
          <BoardCacheInvalidator />
          <NativePullRefresh />
          <NavigationProvider><NativePushProvider>{children}</NativePushProvider></NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
