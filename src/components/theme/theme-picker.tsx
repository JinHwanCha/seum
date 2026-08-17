'use client';

import { useEffect, useRef, useState } from 'react';
import { Palette, Check, X } from 'lucide-react';
import { THEMES } from '@/lib/themes';
import { useTheme } from './theme-provider';
import { cn } from '@/lib/utils';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (
        panelRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const lightThemes = THEMES.filter((t) => t.group === 'light');
  const darkThemes = THEMES.filter((t) => t.group === 'dark');

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-stone-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        title="테마 색상"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Palette size={18} />
      </button>

      {open && (
        <>
          {/* 배경 딤 — 모바일에서만 표시, 탭하면 닫힘 */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="menu"
            className={cn(
              'z-50 warm-surface border border-stone-200/80 shadow-xl overflow-y-auto overscroll-contain',
              // 모바일: 하단 시트(화면 넘침 방지)
              'fixed inset-x-0 bottom-0 max-h-[75vh] rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-sheet-up',
              // 데스크톱: 우측 드롭다운
              'sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:mt-2 sm:w-64 sm:max-h-[70vh] sm:rounded-2xl sm:p-3 sm:animate-none'
            )}
          >
            {/* 그립 핸들 (모바일 전용) */}
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" />

            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-stone-500">테마 색상</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-1 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 sm:hidden"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <p className="px-1 pt-1 pb-1 text-[11px] font-medium text-stone-400">라이트</p>
              {lightThemes.map((t) => (
                <ThemeRow
                  key={t.id}
                  def={t}
                  active={theme === t.id}
                  onSelect={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                />
              ))}
              <p className="px-1 pt-2 pb-1 text-[11px] font-medium text-stone-400">다크</p>
              {darkThemes.map((t) => (
                <ThemeRow
                  key={t.id}
                  def={t}
                  active={theme === t.id}
                  onSelect={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ThemeRow({
  def,
  active,
  onSelect,
}: {
  def: (typeof THEMES)[number];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors',
        active ? 'bg-primary-50 text-primary-700 font-medium' : 'text-stone-600 hover:bg-primary-50/50'
      )}
    >
      <span
        className="relative h-7 w-7 shrink-0 rounded-full border border-stone-300/70 shadow-inner overflow-hidden"
        style={{ backgroundColor: def.swatch.bg }}
      >
        <span
          className="absolute inset-0 m-auto h-3.5 w-3.5 rounded-full"
          style={{ backgroundColor: def.swatch.accent }}
        />
      </span>
      <span className="flex-1 text-left">{def.label}</span>
      {active && <Check size={16} className="text-primary-600" />}
    </button>
  );
}
