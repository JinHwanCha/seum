'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PostCard } from './post-card';
import { PillTabs } from '@/components/ui/pill-tabs';
import type { Post } from '@/lib/types';

interface VillageOpt {
  id: string;
  name: string;
}

interface CategoryOpt {
  id: string;
  name: string;
}

interface PostListProps {
  posts: Post[];
  boardType: string;
  villages?: VillageOpt[];
  categories?: CategoryOpt[];
  villageMap?: Record<string, string>;
  currentVillageId?: string | null;
  /** 사역자 또는 마을장 — 모든 마을 글 열람 가능 */
  canSeeAll?: boolean;
  /** 서버 첫 페이지 이후 더 불러올 글이 있는지 */
  initialHasMore?: boolean;
}

// 마을 카테고리를 보여줄 게시판
const VILLAGE_TAB_BOARDS = ['sharing', 'intercession'];
// 게시글 카테고리를 탭으로 보여줄 게시판
const CATEGORY_TAB_BOARDS = ['gathering'];

export function PostList({
  posts: initialPosts,
  boardType,
  villages = [],
  categories = [],
  villageMap = {},
  initialHasMore = false,
}: PostListProps) {
  // 서버가 내려준 첫 페이지를 초기값으로, '더 보기'로 이어붙인다.
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  // 게시판 전환/서버 재렌더 시 초기화
  useEffect(() => {
    setPosts(initialPosts);
    setHasMore(initialHasMore);
  }, [initialPosts, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/posts?boardType=${encodeURIComponent(boardType)}&offset=${posts.length}`
      );
      if (res.ok) {
        const data = await res.json();
        const more = (data.posts || []) as Post[];
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...more.filter((p) => !seen.has(p.id))];
        });
        setHasMore(Boolean(data.hasMore));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [boardType, posts.length, hasMore, loadingMore]);

  const showVillageTabs = VILLAGE_TAB_BOARDS.includes(boardType) && villages.length > 0;
  const useCategoryTabs = CATEGORY_TAB_BOARDS.includes(boardType);

  // 모든 사용자에게 전체 마을 탭을 노출 (권한없는 village-private 글은 서버에서 이미 걸러짐)
  const visibleVillages = useMemo(() => {
    if (!showVillageTabs) return [];
    return villages;
  }, [showVillageTabs, villages]);

  // 카테고리 탭 = 등록 카테고리 + 작성자가 직접 입력한 카테고리(gathering_type) 이름 기준
  const categoryNames = useMemo(() => {
    if (!useCategoryTabs) return [];
    const names: string[] = [];
    const seen = new Set<string>();
    const add = (name?: string | null) => {
      const n = (name ?? '').trim();
      if (n && !seen.has(n)) {
        seen.add(n);
        names.push(n);
      }
    };
    categories.forEach((c) => add(c.name));
    posts.forEach((p) => add(p.category?.name ?? p.gathering_type));
    return names;
  }, [useCategoryTabs, categories, posts]);

  const showCategoryTabs = useCategoryTabs && categoryNames.length > 0;

  // 'all' or villageId or categoryName
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredPosts = useMemo(() => {
    if (activeTab === 'all') return posts;
    // 카테고리 탭 = 게시글 카테고리 이름 기준으로 그룹핑 (등록/직접입력 모두 포함)
    if (showCategoryTabs) {
      return posts.filter((p) => (p.category?.name ?? p.gathering_type ?? '').trim() === activeTab);
    }
    // 마을 탭 = 작성자가 속한 마을 기준으로 그룹핑 (visibility 무관)
    if (showVillageTabs) return posts.filter((p) => p.author?.village_id === activeTab);
    return posts;
  }, [activeTab, posts, showCategoryTabs, showVillageTabs]);

  const pinned = filteredPosts.filter((p) => p.is_pinned);
  const regular = filteredPosts.filter((p) => !p.is_pinned);

  return (
    <div className="space-y-3">
      {showCategoryTabs ? (
        <PillTabs
          tabs={[
            { key: 'all', label: '전체' },
            ...categoryNames.map((name) => ({ key: name, label: name })),
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      ) : showVillageTabs ? (
        <PillTabs
          tabs={[
            { key: 'all', label: '전체' },
            ...visibleVillages.map((v) => ({ key: v.id, label: v.name })),
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      ) : null}

      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-sm">게시글이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pinned.map((post) => (
            <PostCard key={post.id} post={post} boardType={boardType} villageMap={villageMap} />
          ))}
          {regular.map((post) => (
            <PostCard key={post.id} post={post} boardType={boardType} villageMap={villageMap} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-3 text-sm text-stone-500 hover:text-primary-600 border border-stone-200/80 rounded-xl transition-colors disabled:opacity-50"
        >
          {loadingMore ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </div>
  );
}