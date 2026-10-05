import type { Reaction } from '@/lib/types';

export function setOwnReaction(
  reactions: Reaction[],
  postId: string,
  userId: string,
  emoji: string,
  active: boolean,
  previous?: Reaction[]
): Reaction[] {
  const remaining = reactions.filter((reaction) =>
    reaction.emoji !== emoji || reaction.user_id !== userId
  );
  if (!active) return remaining;
  return [
    ...remaining,
    ...(previous?.length ? previous : [{
      id: `optimistic:${userId}:${emoji}`,
      post_id: postId,
      user_id: userId,
      emoji,
      created_at: new Date().toISOString(),
    }]),
  ];
}

export function groupReactions(reactions: Reaction[], userId: string) {
  return reactions.reduce<Record<string, { count: number; hasReacted: boolean }>>((grouped, reaction) => {
    const entry = grouped[reaction.emoji] ?? { count: 0, hasReacted: false };
    entry.count++;
    if (reaction.user_id === userId) entry.hasReacted = true;
    grouped[reaction.emoji] = entry;
    return grouped;
  }, {});
}
