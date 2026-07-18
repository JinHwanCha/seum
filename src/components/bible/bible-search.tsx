'use client';

import { useState, useCallback } from 'react';
import { Search, BookOpen, Loader2, ArrowRight, Info } from 'lucide-react';
import { parseReference, formatReference, getBook, type BibleVersion } from '@/lib/bible';

interface SearchResult {
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleSearchProps {
  version: BibleVersion;
  onOpenPassage: (book: string, chapter: number) => void;
}

export function BibleSearch({ version, onOpenPassage }: BibleSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 입력이 "요한복음 3:16" 같은 레퍼런스인지 감지
  const reference = parseReference(query);

  const runWordSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setError('두 글자 이상 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/bible/search?q=${encodeURIComponent(q)}&version=${version}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || '검색에 실패했습니다.');
        setResults([]);
      } else {
        setResults(json.results || []);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, version]);

  const highlight = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const idx = text.indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-yellow-200 px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runWordSearch()}
            placeholder="단어 또는 성경 위치 (예: 사랑, 요한복음 3:16)"
            className="w-full rounded-lg border border-stone-300 py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={runWordSearch}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          검색
        </button>
      </div>

      {/* 본문 찾기 (레퍼런스 감지시) */}
      {reference && (
        <button
          onClick={() => onOpenPassage(reference.book, reference.chapter)}
          className="flex w-full items-center gap-3 rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-3 text-left transition-colors hover:bg-primary-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <BookOpen size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-stone-500">본문으로 이동</p>
            <p className="font-medium text-stone-800">
              {getBook(reference.book)?.name} {reference.chapter}장
              {reference.verse ? ` ${reference.verse}절` : ''}
            </p>
          </div>
          <ArrowRight size={18} className="text-primary-500" />
        </button>
      )}

      {/* 단어 검색 안내 */}
      <div className="flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          {version === 'kor'
            ? '개역개정 전체 본문에서 단어를 검색합니다. 단어 또는 "요한복음 3:16" 처럼 위치를 입력해 보세요.'
            : '이 번역본은 지금까지 열람한 본문 범위 안에서만 검색됩니다. 개역개정으로 전환하면 전체 검색이 가능합니다.'}
        </span>
      </div>

      {/* 결과 */}
      {loading && (
        <div className="flex justify-center py-12 text-stone-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      )}

      {error && !loading && (
        <div className="py-8 text-center text-sm text-stone-500">{error}</div>
      )}

      {!loading && !error && searched && results.length === 0 && (
        <div className="py-12 text-center text-sm text-stone-500">
          검색 결과가 없습니다.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs text-stone-400">{results.length}개 구절</p>
          {results.map((r) => (
            <button
              key={`${r.book}-${r.chapter}-${r.verse}`}
              onClick={() => onOpenPassage(r.book, r.chapter)}
              className="block w-full rounded-xl border border-stone-200/80 bg-white px-4 py-3 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/30"
            >
              <p className="mb-1 text-xs font-medium text-primary-600">
                {formatReference(r.book, r.chapter, r.verse)}
              </p>
              <p className="text-sm leading-6 text-stone-700">{highlight(r.text)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
