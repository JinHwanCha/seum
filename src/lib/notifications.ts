import { createClient } from '@/lib/supabase';
import type { NotificationType } from '@/lib/types';

type Supabase = ReturnType<typeof createClient>;

/**
 * 게시글에 댓글/반응이 달렸을 때 글 작성자에게 개인 알림을 생성한다.
 * 작성자 본인이 남긴 반응/댓글이면 알림을 만들지 않는다.
 */
export async function notifyPostAuthor(
  supabase: Supabase,
  opts: {
    postId: string;
    actorId: string;
    actorName: string;
    type: Extract<NotificationType, 'comment' | 'reaction'>;
    snippet?: string;
  }
): Promise<void> {
  const { postId, actorId, actorName, type, snippet } = opts;

  const { data: post } = await supabase
    .from('posts')
    .select('author_id, title, board_type, department_id')
    .eq('id', postId)
    .single();

  if (!post || post.author_id === actorId) return;

  const title =
    type === 'comment'
      ? `${actorName}님이 회원님의 글에 댓글을 남겼어요`
      : `${actorName}님이 회원님의 글에 반응을 남겼어요`;

  const body =
    type === 'reaction' && snippet
      ? `${snippet}  ${post.title}`
      : snippet
      ? snippet
      : post.title;

  await supabase.from('notifications').insert({
    department_id: post.department_id,
    recipient_id: post.author_id,
    actor_id: actorId,
    type,
    post_id: postId,
    board_type: post.board_type,
    title,
    body,
  });

  // 미래(앱 전환): 푸시 발송
  void sendPush(supabase, post.author_id, { title, body });
}

/**
 * 사역자가 '모두에게 알림'으로 공지를 작성했을 때 부서 전원(작성자 제외)에게
 * 방송 알림을 생성한다. (fan-out)
 */
export async function broadcastAnnouncement(
  supabase: Supabase,
  opts: {
    departmentId: string;
    actorId: string;
    postId: string;
    title: string;
    body: string;
  }
): Promise<void> {
  const { departmentId, actorId, postId, title, body } = opts;

  const { data: members } = await supabase
    .from('users')
    .select('id')
    .eq('department_id', departmentId)
    .eq('is_approved', true)
    .neq('id', actorId);

  if (!members || members.length === 0) return;

  const rows = members.map((m: { id: string }) => ({
    department_id: departmentId,
    recipient_id: m.id,
    actor_id: actorId,
    type: 'announcement' as const,
    post_id: postId,
    board_type: 'notice',
    title,
    body,
  }));

  await supabase.from('notifications').insert(rows);

  // 미래(앱 전환): 전원에게 푸시 발송
  for (const m of members) {
    void sendPush(supabase, m.id, { title, body });
  }
}

/**
 * (미래) 모바일 앱 전환 시 사용할 푸시 발송 스텁.
 * 현재는 아무 동작도 하지 않는다. 앱 전환 시:
 *   - push_subscriptions 에서 userId 의 구독 정보를 조회
 *   - web-push(VAPID) 또는 FCM 으로 payload 발송
 */
export async function sendPush(
  _supabase: Supabase,
  _userId: string,
  _payload: { title: string; body: string }
): Promise<void> {
  // no-op (앱 전환 시 구현)
  return;
}
