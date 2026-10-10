'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { useSWRConfig } from 'swr';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { pullRefreshAllowed, pullRefreshDistance, PULL_REFRESH_THRESHOLD } from '@/lib/pull-refresh';

function blocksGesture(target: EventTarget | null) {
  if (!(target instanceof Element)) return true;
  if (target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]')) return true;
  for (let node: Element | null = target; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return true;
  }
  return false;
}

export function NativePullRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.userId;
  const { cache, mutate } = useSWRConfig();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !userId || !pullRefreshAllowed(pathname)) return;
    let active = true;
    let start: { x: number; y: number } | null = null;
    let pulled = 0;
    const reset = () => { start = null; pulled = 0; if (active) setDistance(0); };
    const blocked = () => document.body.style.overflow === 'hidden' ||
      document.querySelector('form, [role="dialog"], [aria-modal="true"]') !== null ||
      document.activeElement?.matches('input, textarea, select, [contenteditable="true"]') ||
      window.scrollY > 1 || (document.scrollingElement?.scrollTop || 0) > 1;
    const onStart = (event: TouchEvent) => {
      reset();
      if (busy.current || event.touches.length !== 1 || blocked() || blocksGesture(event.target)) return;
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const onMove = (event: TouchEvent) => {
      if (!start) return;
      if (event.touches.length !== 1 || blocked()) { reset(); return; }
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (dy < 0 || Math.abs(dx) > Math.max(10, dy)) { reset(); return; }
      if (!event.cancelable) { reset(); return; }
      if (dy > 10) event.preventDefault();
      pulled = pullRefreshDistance(dx, dy);
      setDistance(pulled);
    };
    const onEnd = () => {
      const shouldRefresh = start !== null && pulled >= PULL_REFRESH_THRESHOLD;
      reset();
      if (!shouldRefresh || busy.current) return;
      busy.current = true;
      setRefreshing(true);
      setError(null);
      const keys = Array.from(cache.keys()).filter((key) => cache.get(key)?.data !== undefined);
      // SWR revalidates mounted consumers only; preserve cached content while refreshing.
      mutate(() => true, undefined, { revalidate: true, throwOnError: true }).then(() => {
        if (!active) return;
        if (keys.some((key) => cache.get(key)?.error)) throw new Error('일부 화면 데이터를 갱신하지 못했습니다.');
        startTransition(() => router.refresh());
        window.dispatchEvent(new Event('seum-notifications-changed'));
      }).catch((cause: unknown) => {
        console.error('Native pull-to-refresh failed:', cause);
        if (active) setError('새로고침에 실패했습니다. 연결 상태를 확인하고 다시 당겨주세요.');
      }).finally(() => {
        busy.current = false;
        if (active) setRefreshing(false);
      });
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', reset);
    return () => {
      active = false;
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', reset);
    };
  }, [pathname, userId, cache, mutate, router]);

  useEffect(() => { busy.current = refreshing || pending; }, [refreshing, pending]);
  const showing = distance > 0 || refreshing || pending;
  return (
    <>
      {showing && (
        <div role="status" className="pointer-events-none fixed left-1/2 z-[75] -translate-x-1/2 rounded-full warm-surface border border-primary-200 p-3 shadow-md"
          style={{ top: `calc(var(--seum-safe-top, env(safe-area-inset-top, 0px)) + ${Math.max(8, distance - 32)}px)` }}>
          <RefreshCw size={22} className={refreshing || pending ? 'animate-spin motion-reduce:animate-none text-primary-600' : 'text-primary-600'}
            style={refreshing || pending ? undefined : { transform: `rotate(${distance * 3}deg)` }} />
          <span className="sr-only">{refreshing || pending ? '새로고침 중' : distance >= PULL_REFRESH_THRESHOLD ? '놓으면 새로고침' : '아래로 당겨 새로고침'}</span>
        </div>
      )}
      {error && <div role="alert" className="fixed bottom-24 left-3 right-3 z-[75] rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {error}<button className="ml-3 underline" onClick={() => setError(null)}>닫기</button>
      </div>}
    </>
  );
}
