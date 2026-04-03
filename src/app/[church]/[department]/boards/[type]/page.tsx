'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PostList } from '@/components/board/post-list';
import { Button } from '@/components/ui/button';
import { BOARD_TYPE_LABELS } from '@/lib/constants';
import { canWritePost } from '@/lib/permissions';
import { Plus } from 'lucide-react';
import type { Post, BoardType } from '@/lib/types';

export default function BoardListPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const boardType = params.type as string;
  const basePath = `/${params.church}/${params.department}`;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?boardType=${boardType}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [boardType]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (!user) return null;

  const canWrite = canWritePost(
    user.role as any,
    boardType as BoardType,
    user.isBureauLeader || user.isBureauMember
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-900">
          {BOARD_TYPE_LABELS[boardType] || boardType}
        </h1>
        {canWrite && (
          <Button
            size="sm"
            onClick={() => router.push(`${basePath}/boards/${boardType}/new`)}
          >
            <Plus size={16} className="mr-1" />
            글쓰기
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>
      ) : (
        <PostList posts={posts} boardType={boardType} />
      )}
    </div>
  );
}
