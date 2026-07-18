'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Bookmark,
  Highlighter,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import {
  BIBLE_BOOKS,
  BIBLE_VERSIONS,
  getBook,
  formatReference,
  type BibleVersion,
  type BibleVerse,
} from '@/lib/bible';

const HIGHLIGHT_COLORS: { key: string; label: string; cls: string; dot: string }[] = [
  { key: 'yellow', label: '노랑', cls: 'bg-yellow-200/70', dot: 'bg-yellow-300' },
  { key: 'green', label: '초록', cls: 'bg-green-200/70', dot: 'bg-green-300' },
  { key: 'blue', label: '파랑', cls: 'bg-sky-200/70', dot: 'bg-sky-300' },
  { key: 'pink', label: '분홍', cls: 'bg-pink-200/70', dot: 'bg-pink-300' },
];

interface Mark {
  verse: number;
  type: 'bookmark' | 'highlight';
  color: string;
}

interface BibleReaderProps {
  version: BibleVersion;
  onVersionChange: (v: BibleVersion) => void;
  book: string;
  chapter: number;
  onBookChange: (b: string) => void;
  onChapterChange: (c: number) => void;
  readSet: Set<string>;
  onToggleRead: (book: string, chapter: number, read: boolean) => void;
}

export function BibleReader({
  version,
  onVersionChange,
  book,
  chapter,
  onBookChange,
  onChapterChange,
  readSet,
  onToggleRead,
}: BibleReaderProps) {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [marks, setMarks] = useState<Record<number, Mark[]>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentBook = getBook(book)!;
  const isRead = readSet.has(`${book}:${chapter}`);

  // 본문 로드
  const loadPassage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    try {
      const res = await fetch(
        `/api/bible/passage?book=${book}&chapter=${chapter}&version=${version}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || '본문을 불러오지 못했습니다.');
        setVerses([]);
      } else {
        setVerses(json.verses || []);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, [book, chapter, version]);

  // 북마크/형광펜 로드
  const loadMarks = useCallback(async () => {
    try {
      const res = await fetch(`/api/bible/bookmarks?book=${book}&chapter=${chapter}`);
      const json = await res.json();
      if (res.ok) {
        const map: Record<number, Mark[]> = {};
        (json.bookmarks || []).forEach((m: any) => {
          (map[m.verse] ||= []).push({ verse: m.verse, type: m.type, color: m.color });
        });
        setMarks(map);
      }
    } catch {
      /* ignore */
    }
  }, [book, chapter]);

  useEffect(() => {
    loadPassage();
    loadMarks();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [loadPassage, loadMarks]);

  // 장 이동
  const move = useCallback(
    (dir: -1 | 1) => {
      const bookIdx = BIBLE_BOOKS.findIndex((b) => b.code === book);
      let nextCh = chapter + dir;
      let nextBookIdx = bookIdx;
      if (nextCh < 1) {
        nextBookIdx = bookIdx - 1;
        if (nextBookIdx < 0) return;
        nextCh = BIBLE_BOOKS[nextBookIdx].chapters;
      } else if (nextCh > currentBook.chapters) {
        nextBookIdx = bookIdx + 1;
        if (nextBookIdx >= BIBLE_BOOKS.length) return;
        nextCh = 1;
      }
      if (nextBookIdx !== bookIdx) onBookChange(BIBLE_BOOKS[nextBookIdx].code);
      onChapterChange(nextCh);
    },
    [book, chapter, currentBook, onBookChange, onChapterChange]
  );

  const toggleSelect = useCallback((v: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }, []);

  const selectedVerses = useMemo(
    () => verses.filter((v) => selected.has(v.verse)).sort((a, b) => a.verse - b.verse),
    [verses, selected]
  );

  // 복사
  const handleCopy = useCallback(async () => {
    if (selectedVerses.length === 0) return;
    const first = selectedVerses[0].verse;
    const last = selectedVerses[selectedVerses.length - 1].verse;
    const ref = formatReference(book, chapter, first, last);
    const bodyText = selectedVerses.map((v) => `${v.verse}. ${v.text}`).join('\n');
    const text = `[${ref}]\n${bodyText}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [selectedVerses, book, chapter]);

  // 마크 토글 (북마크/형광펜)
  const applyMark = useCallback(
    async (type: 'bookmark' | 'highlight', color = 'yellow') => {
      const targets = Array.from(selected);
      if (targets.length === 0) return;
      // 낙관적 반영
      setMarks((prev) => {
        const next = { ...prev };
        for (const v of targets) {
          const list = (next[v] || []).filter((m) => m.type !== type);
          const existing = (prev[v] || []).find((m) => m.type === type);
          if (!existing || (type === 'highlight' && existing.color !== color)) {
            list.push({ verse: v, type, color });
          }
          next[v] = list;
        }
        return next;
      });
      await Promise.all(
        targets.map((v) =>
          fetch('/api/bible/bookmarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book, chapter, verse: v, type, color }),
          })
        )
      );
      loadMarks();
      if (type === 'highlight') setPickerOpen(false);
    },
    [selected, book, chapter, loadMarks]
  );

  const clearSelection = () => setSelected(new Set());

  return (
    <div className="space-y-3">
      {/* 상단 컨트롤 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 책 선택 */}
        <select
          value={book}
          onChange={(e) => {
            onBookChange(e.target.value);
            onChapterChange(1);
          }}
          className="appearance-none rounded-lg border border-stone-300 bg-no-repeat pl-3 pr-9 py-2 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1rem',
          }}
        >
          <optgroup label="구약">
            {BIBLE_BOOKS.filter((b) => b.testament === 'old').map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </optgroup>
          <optgroup label="신약">
            {BIBLE_BOOKS.filter((b) => b.testament === 'new').map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </optgroup>
        </select>

        {/* 장 선택 */}
        <select
          value={chapter}
          onChange={(e) => onChapterChange(parseInt(e.target.value, 10))}
          className="appearance-none rounded-lg border border-stone-300 bg-no-repeat pl-3 pr-9 py-2 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1rem',
          }}
        >
          {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((c) => (
            <option key={c} value={c}>{c}장</option>
          ))}
        </select>

        {/* 번역본 전환 */}
        <div className="ml-auto flex rounded-lg border border-stone-200 overflow-hidden">
          {BIBLE_VERSIONS.map((v) => (
            <button
              key={v.key}
              onClick={() => onVersionChange(v.key)}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors',
                version === v.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-50'
              )}
            >
              {v.short}
            </button>
          ))}
        </div>
      </div>

      {/* 본문 카드 */}
      <div className="space-y-3">
        {/* 제목 + 읽음 체크 */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-stone-900">
            {currentBook.name} {chapter}장
          </h2>
          <button
            onClick={() => onToggleRead(book, chapter, !isRead)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              isRead
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            )}
          >
            <Check size={14} />
            {isRead ? '읽음' : '읽음 표시'}
          </button>
        </div>

        {/* 본문 */}
        <div ref={scrollRef} className="max-h-[60vh] space-y-1 overflow-y-auto px-1 py-1">
          {loading && (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 className="animate-spin" size={24} />
            </div>
          )}
          {error && !loading && (
            <div className="py-16 text-center text-sm text-stone-500">{error}</div>
          )}
          {!loading && !error && verses.length === 0 && (
            <div className="py-16 text-center text-sm text-stone-500">본문이 없습니다.</div>
          )}
          {!loading &&
            !error &&
            verses.map((v) => {
              const vMarks = marks[v.verse] || [];
              const highlight = vMarks.find((m) => m.type === 'highlight');
              const bookmarked = vMarks.some((m) => m.type === 'bookmark');
              const isSel = selected.has(v.verse);
              const hlCls = highlight
                ? HIGHLIGHT_COLORS.find((c) => c.key === highlight.color)?.cls
                : '';
              return (
                <p
                  key={v.verse}
                  onClick={() => toggleSelect(v.verse)}
                  className={cn(
                    'group cursor-pointer rounded-md px-2 py-1.5 text-[15px] leading-7 text-stone-800 transition-colors',
                    isSel ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-stone-50'
                  )}
                >
                  <sup className="mr-1 select-none font-bold text-primary-500">{v.verse}</sup>
                  {bookmarked && (
                    <Bookmark size={12} className="mr-1 inline fill-amber-400 text-amber-500" />
                  )}
                  <span className={cn('rounded px-0.5', hlCls)}>{v.text}</span>
                </p>
              );
            })}
        </div>

        {/* 하단 이동 */}
        <div className="flex items-center justify-between border-t border-stone-200/80 px-4 py-2">
          <button
            onClick={() => move(-1)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <span className="text-xs text-stone-400">{version === 'kor' ? '개역개정' : 'NIV'}</span>
          <button
            onClick={() => move(1)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            다음 <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 선택 액션 바 */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-2xl px-3 md:bottom-4">
          <div className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-white/95 p-2 shadow-lg backdrop-blur">
            <span className="px-2 text-xs font-medium text-stone-500">{selected.size}절 선택</span>
            <button
              onClick={handleCopy}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-stone-700 hover:bg-stone-100"
            >
              {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
              <span className="text-[11px]">{copied ? '복사됨' : '복사'}</span>
            </button>
            <button
              onClick={() => setPickerOpen(true)}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-stone-700 hover:bg-stone-100"
            >
              <Highlighter size={18} />
              <span className="text-[11px]">형광펜</span>
            </button>
            <button
              onClick={() => applyMark('bookmark')}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-stone-700 hover:bg-stone-100"
            >
              <Bookmark size={18} />
              <span className="text-[11px]">북마크</span>
            </button>
            <button
              onClick={clearSelection}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-stone-500 hover:bg-stone-100"
            >
              <X size={18} />
              <span className="text-[11px]">해제</span>
            </button>
          </div>
        </div>
      )}

      {/* 형광펜 색상 선택 */}
      <Modal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} title="형광펜 색상" className="max-w-xs">
        <div className="grid grid-cols-4 gap-3">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => applyMark('highlight', c.key)}
              className="flex flex-col items-center gap-2 rounded-lg p-2 hover:bg-stone-50"
            >
              <span className={cn('h-10 w-10 rounded-full', c.dot)} />
              <span className="text-xs text-stone-600">{c.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-stone-400">
          같은 색을 다시 적용하면 형광펜이 해제됩니다.
        </p>
      </Modal>
    </div>
  );
}
