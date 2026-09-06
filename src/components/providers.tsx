'use client';

import { useState } from 'react';
import { SWRConfig } from 'swr';
import { AuthProvider } from '@/hooks/use-auth';
import { ThemeProvider } from '@/components/theme/theme-provider';
import type { SessionPayload } from '@/lib/types';

const swrFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
  });

export const SWR_CACHE_PREFIX = 'seum-swr-cache:';

// SWR 캐시를 localStorage 에 유지해 재방문/새로고침 시 이전 데이터를 즉시 렌더한다.
// 이후 백그라운드 재검증으로 최신값을 반영한다. 계정이 섞이지 않도록 사용자별 키를 쓴다.
function createLocalStorageProvider(cacheKey: string) {
  // SWR Cache 는 값 타입이 any 라 map 도 any 로 맞춘다.
  return (): Map<string, any> => {
    const map = new Map<string, any>();
    if (typeof window === 'undefined') return map;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        for (const [k, v] of JSON.parse(raw) as [string, any][]) map.set(k, v);
      }
    } catch {
      // 손상된 캐시는 무시
    }
    const save = () => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(Array.from(map.entries())));
      } catch {
        // 용량 초과 등은 무시
      }
    };
    window.addEventListener('beforeunload', save);
    // 모바일은 beforeunload 가 안 뜨는 경우가 많아 백그라운드 진입 시에도 저장한다.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save();
    });
    return map;
  };
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
    initialUser ? createLocalStorageProvider(`${SWR_CACHE_PREFIX}${initialUser.userId}`) : undefined
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
      <ThemeProvider>
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
