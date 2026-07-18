'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Check, BookOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BIBLE_BOOKS, TOTAL_CHAPTERS } from '@/lib/bible';

interface BibleReadingPlanProps {
  readSet: Set<string>;
  progressLoaded: boolean;
  onToggleRead: (book: string, chapter: number, read: boolean) => void;
  onOpenChapter: (book: string, chapter: number) => void;
}

export function BibleReadingPlan({
  readSet,
  progressLoaded,
  onToggleRead,
  onOpenChapter,
}: BibleReadingPlanProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'old' | 'new'>('all');

  const totalRead = readSet.size;
  const percent = Math.round((totalRead / TOTAL_CHAPTERS) * 100);

  const bookStats = useMemo(() => {
    const map: Record<string, number> = {};
    readSet.forEach((k) => {
      const b = k.split(':')[0];
      map[b] = (map[b] || 0) + 1;
    });
    return map;
  }, [readSet]);

  const books = BIBLE_BOOKS.filter((b) => filter === 'all' || b.testament === filter);

  return (
    <div className="space-y-4">
      {/* 전체 진도 */}
      <div className="rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-100">전체 통독 진도</p>
            <p className="mt-1 text-2xl font-bold">
              {totalRead}
              <span className="text-base font-normal text-primary-100"> / {TOTAL_CHAPTERS}장</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{percent}%</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* 구/신약 필터 */}
      <div className="flex gap-2">
        {([
          { k: 'all', l: '전체' },
          { k: 'old', l: '구약' },
          { k: 'new', l: '신약' },
        ] as const).map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filter === f.k ? 'bg-primary-600 text-white' : 'bg-stone-100 text-stone-600'
            )}
          >
            {f.l}
          </button>
        ))}
      </div>

      {!progressLoaded && (
        <div className="flex justify-center py-8 text-stone-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      )}

      {/* 책 리스트 */}
      <div className="space-y-2">
        {books.map((b) => {
          const read = bookStats[b.code] || 0;
          const done = read === b.chapters;
          const isOpen = expanded === b.code;
          return (
            <div key={b.code} className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
              <button
                onClick={() => setExpanded(isOpen ? null : b.code)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    done ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                  )}
                >
                  {done ? <Check size={16} /> : b.abbr}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-800">{b.name}</span>
                    <span className="text-xs text-stone-400">
                      {read}/{b.chapters}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={cn('h-full rounded-full transition-all', done ? 'bg-emerald-400' : 'bg-primary-400')}
                      style={{ width: `${(read / b.chapters) * 100}%` }}
                    />
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={cn('shrink-0 text-stone-400 transition-transform', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen && (
                <div className="border-t border-stone-100 px-4 py-3">
                  <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                    {Array.from({ length: b.chapters }, (_, i) => i + 1).map((c) => {
                      const chRead = readSet.has(`${b.code}:${c}`);
                      return (
                        <button
                          key={c}
                          onClick={() => onToggleRead(b.code, c, !chRead)}
                          className={cn(
                            'aspect-square rounded-md text-xs font-medium transition-colors',
                            chRead
                              ? 'bg-emerald-500 text-white'
                              : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => onOpenChapter(b.code, 1)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    <BookOpen size={15} /> {b.name} 읽으러 가기
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="pb-2 text-center text-xs text-stone-400">
        장 번호를 눌러 읽음 표시를 켜거나 끌 수 있어요.
      </p>
    </div>
  );
}
