'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/date-utils';
import { canDeleteComment, canEditComment } from '@/lib/permissions';
import { Trash2, Edit3, CornerDownRight } from 'lucide-react';
import type { Comment, SessionPayload } from '@/lib/types';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  session: SessionPayload;
  onRefresh: () => void;
}

export function CommentSection({ postId, comments, session, onRefresh }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  const topLevelComments = comments.filter((c) => !c.parent_id);

  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  const submitComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), parentId }),
      });
      if (res.ok) {
        setNewComment('');
        setReplyTo(null);
        setReplyContent('');
        onRefresh();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const updateComment = async (commentId: string) => {
    if (!editContent.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditContent('');
        onRefresh();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      // ignore
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isAuthor = comment.author_id === session.userId;
    const canDelete = canDeleteComment(session.role as any, isAuthor);
    const canEdit = canEditComment(isAuthor);
    const replies = getReplies(comment.id);

    return (
      <div key={comment.id} className={isReply ? 'ml-8 mt-2' : 'mt-3'}>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {isReply && <CornerDownRight size={12} className="text-gray-400" />}
              <span className="text-sm font-medium text-gray-900">
                {comment.author?.name}
              </span>
              <span className="text-xs text-gray-400">
                {formatDateTime(comment.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Edit3 size={12} />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {editingId === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateComment(comment.id)} loading={loading}>
                  수정
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
              {!isReply && (
                <button
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="text-xs text-primary-600 mt-1 hover:underline"
                >
                  답글
                </button>
              )}
            </>
          )}
        </div>

        {/* Reply form */}
        {replyTo === comment.id && (
          <div className="ml-8 mt-2 space-y-2">
            <Textarea
              placeholder="답글을 입력하세요..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => submitComment(replyContent, comment.id)}
                loading={loading}
              >
                답글 작성
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                취소
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {replies.map((reply) => renderComment(reply, true))}
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        댓글 {comments.length}개
      </h3>

      {/* New comment form */}
      <div className="flex gap-2">
        <Textarea
          placeholder="댓글을 입력하세요..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={2}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={() => submitComment(newComment)}
          loading={loading}
          className="self-end"
        >
          작성
        </Button>
      </div>

      {/* Comments list */}
      <div className="divide-y divide-gray-100">
        {topLevelComments.map((comment) => renderComment(comment))}
      </div>
    </div>
  );
}
