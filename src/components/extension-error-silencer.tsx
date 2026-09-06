'use client';

import { useEffect } from 'react';

// 확장 프로그램(web-vitals INP)이 requestIdleCallback 안에서 t.entries[0].startTime 에
// 접근하다 던지는 "Cannot read properties of undefined (reading 'startTime')" 를 막는다.
// Chrome DevTools 는 '진짜 uncaught' 예외를 preventDefault 로 못 숨기므로, 확장이 스케줄한
// idle 콜백을 우리가 try/catch 로 감싸 '잡힌 에러'로 바꿔 애초에 콘솔에 안 찍히게 한다.
// 우리 앱은 startTime 을 쓰지 않아 실제 버그를 가릴 위험이 없다.

function isStartTimeError(v: unknown): boolean {
  if (!v) return false;
  const msg = v instanceof Error ? `${v.message} ${v.stack ?? ''}` : String(v);
  return msg.includes("reading 'startTime'") || msg.includes('.startTime');
}

export function ExtensionErrorSilencer() {
  useEffect(() => {
    const w = window as typeof window & {
      requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
    };

    // 1) 핵심: requestIdleCallback 콜백을 감싸 해당 에러만 삼킨다.
    const originalRIC = w.requestIdleCallback;
    if (typeof originalRIC === 'function') {
      w.requestIdleCallback = function (cb: IdleRequestCallback, opts?: IdleRequestOptions) {
        return originalRIC.call(
          window,
          (deadline: IdleDeadline) => {
            try {
              return cb(deadline);
            } catch (err) {
              if (isStartTimeError(err)) return;
              throw err;
            }
          },
          opts
        );
      };
    }

    // 2) 보조: 다른 경로(throw / promise rejection / console.error)로 새어나올 때도 필터.
    const onError = (e: ErrorEvent) => {
      if (isStartTimeError(e.error) || (e.message || '').includes("reading 'startTime'")) {
        e.preventDefault();
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isStartTimeError(e.reason)) e.preventDefault();
    };
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection, true);

    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      if (args.some(isStartTimeError) || args.join(' ').includes("reading 'startTime'")) return;
      originalConsoleError.apply(console, args as []);
    };

    return () => {
      if (typeof originalRIC === 'function') w.requestIdleCallback = originalRIC;
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onRejection, true);
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
