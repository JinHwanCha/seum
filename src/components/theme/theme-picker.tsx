'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Check, X } from 'lucide-react';
import { THEMES } from '@/lib/themes';
import { useTheme } from './theme-provider';
import { cn } from '@/lib/utils';

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        desktopRef.current?.contains(t) ||
        mobileRef.current?.contains(t) ||
        btnRef.current?.contains(t)
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

  const options = (
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
  );

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

      {/* 데스크톱: 버튼 기준 드롭다운 (모바일에는 숨김) */}
      {open && (
        <div
          ref={desktopRef}
          role="menu"
          className="hidden sm:block absolute right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-2xl border border-stone-200/80 warm-surface shadow-xl z-50 p-3"
        >
          <p className="px-1 pb-2 text-xs font-semibold text-stone-500">테마 색상</p>
          {options}
        </div>
      )}

      {/* 모바일: 하단 시트 — 헤더 stacking context 탈출을 위해 body 로 포탈 */}
      {open &&
        mounted &&
        createPortal(
          <div className="sm:hidden">
            <div
              className="fixed inset-0 z-[60] bg-black/40"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />
            <div
              ref={mobileRef}
              role="menu"
              className="fixed inset-x-0 bottom-0 z-[70] max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-3xl border border-stone-200/80 warm-surface shadow-xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-sheet-up"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300" />
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-stone-500">테마 색상</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="-mr-1 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                  aria-label="닫기"
                >
                  <X size={18} />
                </button>
              </div>
              {options}
            </div>
          </div>,
          document.body
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
