'use client';

import { useMemo, useState } from 'react';
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
}

// 마을 카테고리를 보여줄 게시판
const VILLAGE_TAB_BOARDS = ['sharing', 'intercession'];
// 게시글 카테고리를 탭으로 보여줄 게시판
const CATEGORY_TAB_BOARDS = ['gathering'];

export function PostList({
  posts,
  boardType,
  villages = [],
  categories = [],
  villageMap = {},
}: PostListProps) {
  const showVillageTabs = VILLAGE_TAB_BOARDS.includes(boardType) && villages.length > 0;
  const useCategoryTabs = CATEGORY_TAB_BOARDS.includes(boardType);

  // 모든 사용자에게 전체 마을 탭을 노출 (권한없는 village-private 글은 서버에서 이미 걸러짐)
  const visibleVillages = useMemo(() => {
    if (!showVillageTabs) return [];
    return villages;
  }, [showVillageTabs, villages]);

  const showCategoryTabs = useCategoryTabs && categories.length > 0;

  // 'all' or villageId or categoryId
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredPosts = useMemo(() => {
    if (activeTab === 'all') return posts;
    // 카테고리 탭 = 게시글 카테고리 기준으로 그룹핑
    if (showCategoryTabs) return posts.filter((p) => p.category?.id === activeTab);
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
            ...categories.map((c) => ({ key: c.id, label: c.name })),
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
    </div>
  );
}