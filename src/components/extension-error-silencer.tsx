'use client';

import { useEffect } from 'react';

// React DevTools 등 확장 프로그램이 페이지에 주입하는 installHook.js(INP web-vitals)에서
// t.entries[0] 가 없을 때 "Cannot read properties of undefined (reading 'startTime')" 가
// Uncaught 로 콘솔에 찍힌다. 우리 앱 코드가 아니므로 이 특정 에러만 조용히 무시한다.
// (앱은 startTime 을 전혀 쓰지 않아 실제 버그를 가릴 위험이 없다.)
export function ExtensionErrorSilencer() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if ((e.message || '').includes("reading 'startTime'")) {
        e.preventDefault();
      }
    };
    window.addEventListener('error', onError, true);
    return () => window.removeEventListener('error', onError, true);
  }, []);

  return null;
}
