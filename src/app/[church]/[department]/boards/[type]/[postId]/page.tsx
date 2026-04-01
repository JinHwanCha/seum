'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommentSection } from '@/components/board/comment-section';
import { ReactionBar } from '@/components/board/reaction-bar';
import { canEditPost, canDeletePost } from '@/lib/permissions';
import { formatDateTime } from '@/lib/date-utils';
import { BOARD_TYPE_LABELS } from '@/lib/constants';
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react';
import type { Post, Comment, Reaction, BoardType } from '@/lib/types';

export default function PostDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const boardType = params.type as string;
  const basePath = `/${params.church}/${params.department}`;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
        setComments(data.comments || []);
        setReactions(data.reactions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push(`${basePath}/boards/${boardType}`);
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>;
  }

  if (!post || !user) {
    return <div className="text-center py-8 text-gray-400 text-sm">게시글을 찾을 수 없습니다.</div>;
  }

  const isAuthor = post.author_id === user.userId;
  const canEdit = canEditPost(user.role as any, isAuthor);
  const canDelete = canDeletePost(user.role as any, boardType as BoardType, isAuthor);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => router.push(`${basePath}/boards/${boardType}`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={16} />
        {BOARD_TYPE_LABELS[boardType]} 목록
      </button>

      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {post.is_pinned && <Badge variant="danger">고정</Badge>}
              {post.category && <Badge>{post.category.name}</Badge>}
              {post.gathering_type && <Badge variant="primary">{post.gathering_type}</Badge>}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{post.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{post.author?.name}</span>
              <span>{formatDateTime(post.created_at)}</span>
              {post.updated_at !== post.created_at && <span>(수정됨)</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => router.push(`${basePath}/boards/${boardType}/${postId}/edit`)}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit3 size={16} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="prose prose-sm max-w-none mb-6">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>

        {/* Reactions */}
        <div className="border-t border-gray-100 pt-4 mb-4">
          <ReactionBar
            postId={postId}
            reactions={reactions}
            session={user}
            onRefresh={fetchPost}
          />
        </div>

        {/* Comments */}
        <div className="border-t border-gray-100 pt-4">
          <CommentSection
            postId={postId}
            comments={comments}
            session={user}
            onRefresh={fetchPost}
          />
        </div>
      </Card>
    </div>
  );
}
