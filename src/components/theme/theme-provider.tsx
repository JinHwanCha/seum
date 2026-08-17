'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEFAULT_THEME, isValidTheme, THEME_STORAGE_KEY, type ThemeId } from '@/lib/themes';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): ThemeId {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (isValidTheme(attr)) return attr;
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readInitialTheme);
  const syncedFromServer = useRef(false);

  const applyTheme = useCallback((next: ThemeId, persist: boolean) => {
    setThemeState(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // 저장 실패는 무시 (프라이빗 모드 등)
      }
      // 로그인 사용자라면 서버에도 저장(기기 간 동기화)
      fetch('/api/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      }).catch(() => {});
    }
  }, []);

  const setTheme = useCallback((next: ThemeId) => applyTheme(next, true), [applyTheme]);

  // 최초 마운트: 로컬 저장값이 없으면 서버 저장값으로 초기화
  useEffect(() => {
    if (syncedFromServer.current) return;
    syncedFromServer.current = true;

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }

    if (isValidTheme(stored)) {
      if (stored !== theme) applyTheme(stored, false);
      return;
    }

    // 로컬 값이 없을 때만 서버 값 조회
    fetch('/api/settings/theme')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && isValidTheme(data.theme)) {
          applyTheme(data.theme, false);
          try {
            localStorage.setItem(THEME_STORAGE_KEY, data.theme);
          } catch {
            // 무시
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
