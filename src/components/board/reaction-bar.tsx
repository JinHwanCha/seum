'use client';
import { notifyBoardChanged } from '@/lib/board-cache';

import { useEffect, useRef, useState } from 'react';
import { EMOJIS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { groupReactions, setOwnReaction } from '@/lib/reaction-state';
import type { Reaction, SessionPayload } from '@/lib/types';

interface ReactionBarProps {
  postId: string;
  reactions: Reaction[];
  session: SessionPayload;
}

export function ReactionBar({ postId, reactions, session }: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [items, setItems] = useState(reactions);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(reactions);
  const operations = useRef(new Map<string, { active: boolean; previous: Reaction[] }>());

  useEffect(() => {
    let next = reactions;
    operations.current.forEach((operation, emoji) => {
      next = setOwnReaction(next, postId, session.userId, emoji, operation.active);
    });
    itemsRef.current = next;
    setItems(next);
  }, [reactions, postId, session.userId]);

  const grouped = groupReactions(items, session.userId);

  const toggleReaction = async (emoji: string) => {
    if (operations.current.has(emoji)) return;
    const previous = itemsRef.current.filter((reaction) =>
      reaction.emoji === emoji && reaction.user_id === session.userId
    );
    const active = previous.length === 0;
    operations.current.set(emoji, { active, previous });
    setPending(new Set(operations.current.keys()));
    itemsRef.current = setOwnReaction(itemsRef.current, postId, session.userId, emoji, active);
    setItems(itemsRef.current);
    setShowPicker(false);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: active ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      const data: unknown = await response.json();
      if (!response.ok || typeof data !== 'object' || data === null ||
          !('success' in data) || data.success !== true) {
        const message = typeof data === 'object' && data !== null &&
          'error' in data && typeof data.error === 'string'
          ? data.error
          : '공감을 저장하지 못했습니다. 다시 시도해주세요.';
        throw new Error(message);
      }
      notifyBoardChanged();
    } catch (cause) {
      itemsRef.current = setOwnReaction(
        itemsRef.current, postId, session.userId, emoji, previous.length > 0, previous
      );
      setItems(itemsRef.current);
      setError(cause instanceof Error ? cause.message : '공감을 저장하지 못했습니다. 다시 시도해주세요.');
      console.error('Reaction update failed:', cause);
    } finally {
      operations.current.delete(emoji);
      setPending(new Set(operations.current.keys()));
    }
  };

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      {Object.entries(grouped).map(([emoji, { count, hasReacted }]) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(emoji)}
          disabled={pending.has(emoji)}
          aria-pressed={hasReacted}
          aria-busy={pending.has(emoji)}
          aria-label={`${emoji} 공감 ${count}개`}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors',
            hasReacted
              ? 'bg-primary-50 border-primary-200 text-primary-700'
              : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
          )}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}

      <button
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-50 border border-stone-200 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors text-sm"
      >
        +
      </button>

      {showPicker && (
        <div className="absolute bottom-full mb-2 warm-surface rounded-xl shadow-lg border border-stone-200 p-1 flex flex-wrap justify-center z-10 mx-auto max-w-[calc(100vw-2rem)]">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              disabled={pending.has(emoji)}
              aria-label={`${emoji} 공감 추가`}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-primary-50 transition-colors text-lg shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {pending.size > 0 && <span role="status" className="text-xs text-stone-400">저장 중…</span>}
      {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
