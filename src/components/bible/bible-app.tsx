'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, ListChecks, Users, Search } from 'lucide-react';
import { PillTabs } from '@/components/ui/pill-tabs';
import { BibleReader } from './bible-reader';
import { BibleReadingPlan } from './bible-reading-plan';
import { BibleGroupProgress } from './bible-group-progress';
import { BibleSearch } from './bible-search';
import type { BibleVersion } from '@/lib/bible';
import { DEFAULT_VERSION } from '@/lib/bible';

type TabKey = 'read' | 'plan' | 'group' | 'search';

const TABS = [
  { key: 'read', label: '읽기', icon: BookOpen },
  { key: 'plan', label: '읽기표', icon: ListChecks },
  { key: 'group', label: '소그룹', icon: Users },
  { key: 'search', label: '검색', icon: Search },
];

const STORAGE_KEY = 'seum-bible-pos';

export function BibleApp() {
  const [tab, setTab] = useState<TabKey>('read');
  const [version, setVersion] = useState<BibleVersion>(DEFAULT_VERSION);
  const [book, setBook] = useState('genesis');
  const [chapter, setChapter] = useState(1);

  // 읽음 진도: "book:chapter" 집합
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [progressLoaded, setProgressLoaded] = useState(false);

  // 마지막 읽던 위치 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.book) setBook(p.book);
        if (p.chapter) setChapter(p.chapter);
        if (p.version) setVersion(p.version);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ book, chapter, version }));
    } catch {
      /* ignore */
    }
  }, [book, chapter, version]);

  // 진도 로드
  const loadProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/bible/progress');
      const json = await res.json();
      if (res.ok) {
        setReadSet(new Set((json.progress || []).map((p: any) => `${p.book}:${p.chapter}`)));
      }
    } catch {
      /* ignore */
    } finally {
      setProgressLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const toggleRead = useCallback(
    async (b: string, c: number, read: boolean) => {
      const key = `${b}:${c}`;
      // 낙관적 업데이트
      setReadSet((prev) => {
        const next = new Set(prev);
        if (read) next.add(key);
        else next.delete(key);
        return next;
      });
      try {
        const res = await fetch('/api/bible/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book: b, chapter: c, read }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // 롤백
        setReadSet((prev) => {
          const next = new Set(prev);
          if (read) next.delete(key);
          else next.add(key);
          return next;
        });
      }
    },
    []
  );

  const goToPassage = useCallback((b: string, c: number) => {
    setBook(b);
    setChapter(c);
    setTab('read');
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900 mb-1">
          <BookOpen size={22} className="text-primary-600" /> 성경
        </h1>
        <p className="text-sm text-stone-500">말씀을 읽고, 읽기표로 진도를 관리하세요.</p>
      </div>

      <PillTabs
        tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
      />

      {tab === 'read' && (
        <BibleReader
          version={version}
          onVersionChange={setVersion}
          book={book}
          chapter={chapter}
          onBookChange={setBook}
          onChapterChange={setChapter}
          readSet={readSet}
          onToggleRead={toggleRead}
        />
      )}
      {tab === 'plan' && (
        <BibleReadingPlan
          readSet={readSet}
          progressLoaded={progressLoaded}
          onToggleRead={toggleRead}
          onOpenChapter={goToPassage}
        />
      )}
      {tab === 'group' && <BibleGroupProgress />}
      {tab === 'search' && <BibleSearch version={version} onOpenPassage={goToPassage} />}
    </div>
  );
}
