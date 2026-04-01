'use client';

import { useState } from 'react';
import { EMOJIS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Reaction, SessionPayload } from '@/lib/types';

interface ReactionBarProps {
  postId: string;
  reactions: Reaction[];
  session: SessionPayload;
  onRefresh: () => void;
}

export function ReactionBar({ postId, reactions, session, onRefresh }: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, { count: number; hasReacted: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasReacted: false };
    acc[r.emoji].count++;
    if (r.user_id === session.userId) acc[r.emoji].hasReacted = true;
    return acc;
  }, {});

  const toggleReaction = async (emoji: string) => {
    try {
      const hasReacted = grouped[emoji]?.hasReacted;
      await fetch(`/api/posts/${postId}/reactions`, {
        method: hasReacted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      onRefresh();
    } catch {
      // ignore
    }
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(grouped).map(([emoji, { count, hasReacted }]) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(emoji)}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors',
            hasReacted
              ? 'bg-primary-50 border-primary-200 text-primary-700'
              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
          )}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm"
        >
          +
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex gap-1 z-10">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
