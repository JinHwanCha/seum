'use client';

import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
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
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-2xl border border-stone-200/80 warm-surface shadow-xl z-50 p-3"
        >
          <p className="px-1 pb-2 text-xs font-semibold text-stone-500">테마 색상</p>

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
