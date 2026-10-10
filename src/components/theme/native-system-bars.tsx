'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { THEMES, THEME_PAGE_BG } from '@/lib/themes';
import { useTheme } from '@/components/theme/theme-provider';

const AndroidSystemBars = registerPlugin<{
  apply(options: { color: string; dark: boolean }): Promise<void>;
}>('SeumSystemBars');

export function NativeSystemBars() {
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const updates = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!Capacitor.isPluginAvailable('StatusBar') ||
        (Capacitor.getPlatform() === 'android' && !Capacitor.isPluginAvailable('SeumSystemBars'))) {
      setError('상태바 테마 적용을 위해 최신 앱을 설치해주세요.');
      return;
    }
    const root = document.documentElement;
    // Android native margins already exclude system bars; do not apply CSS insets twice.
    if (Capacitor.getPlatform() === 'android') {
      root.style.setProperty('--seum-safe-top', '0px');
      root.style.setProperty('--seum-safe-bottom', '0px');
    }
    let active = true;
    const update = () => {
      updates.current = updates.current.then(async () => {
        if (!active) return;
        await StatusBar.setStyle({
          style: THEMES.find((item) => item.id === theme)?.group === 'dark' ? Style.Dark : Style.Light,
        });
        if (!active) return;
        if (Capacitor.getPlatform() === 'android') {
          await AndroidSystemBars.apply({
            color: THEME_PAGE_BG[theme],
            dark: THEMES.find((item) => item.id === theme)?.group === 'dark',
          });
        }
        if (active) setError(null);
      }).catch((cause: unknown) => {
        console.error('Native status bar update failed:', cause);
        if (active) setError('상태바 설정에 실패했습니다. 앱을 다시 실행해주세요.');
      });
    };
    const resume = () => { if (document.visibilityState === 'visible') update(); };
    update();
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', resume);
    };
  }, [theme]);

  return error ? (
    <div role="alert" className="fixed bottom-24 left-3 right-3 z-[70] rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {error}<button className="ml-3 underline" onClick={() => setError(null)}>닫기</button>
    </div>
  ) : null;
}
