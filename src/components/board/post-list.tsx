'use client';

import { useMemo, useState } from 'react';
import { PostCard } from './post-card';
import type { Post } from '@/lib/types';

interface VillageOpt {
  id: string;
  name: string;
}

interface PostListProps {
  posts: Post[];
  boardType: string;
  villages?: VillageOpt[];
  currentVillageId?: string | null;
  /** 사역자 또는 마을장 — 모든 마을 글 열람 가능 */
  canSeeAll?: boolean;
}

// 마을 카테고리를 보여줄 게시판
const VILLAGE_TAB_BOARDS = ['sharing', 'gathering', 'intercession'];

export function PostList({
  posts,
  boardType,
  villages = [],
  currentVillageId = null,
  canSeeAll = false,
}: PostListProps) {
  const showTabs = VILLAGE_TAB_BOARDS.includes(boardType) && villages.length > 0;

  // 사용자가 볼 수 있는 마을 탭 (사역자·마을장·마을미배정은 전체 마을, 그 외에는 자기 마을만)
  const visibleVillages = useMemo(() => {
    if (!showTabs) return [];
    if (canSeeAll || !currentVillageId) return villages;
    return villages.filter((v) => v.id === currentVillageId);
  }, [showTabs, canSeeAll, currentVillageId, villages]);

  // 'all' or villageId
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredPosts = useMemo(() => {
    if (!showTabs || activeTab === 'all') return posts;
    return posts.filter((p) => p.visibility === 'village' && p.village_id === activeTab);
  }, [showTabs, activeTab, posts]);

  const pinned = filteredPosts.filter((p) => p.is_pinned);
  const regular = filteredPosts.filter((p) => !p.is_pinned);

  return (
    <div className="space-y-3">
      {showTabs && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <TabBtn active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
            전체
          </TabBtn>
          {visibleVillages.map((v) => (
            <TabBtn
              key={v.id}
              active={activeTab === v.id}
              onClick={() => setActiveTab(v.id)}
            >
              {v.name}
            </TabBtn>
          ))}
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-sm">게시글이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pinned.map((post) => (
            <PostCard key={post.id} post={post} boardType={boardType} />
          ))}
          {regular.map((post) => (
            <PostCard key={post.id} post={post} boardType={boardType} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
      }`}
    >
      {children}
    </button>
  );
}
