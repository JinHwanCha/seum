import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { loadNotifications } from '@/lib/notifications';
import { notificationPreview } from '@/lib/notification-preview';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get('countOnly') === '1';
  const unreadAnnouncements = searchParams.get('unreadAnnouncements') === '1';

  const supabase = createClient();

  // 미읽음 개수만 필요할 때 (헤더 벨 배지)
  if (countOnly) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', session.userId)
      .eq('is_read', false);
    return NextResponse.json({ unreadCount: count ?? 0 });
  }

  // 홈 진입 팝업용 — 미확인 공지 알림만
  if (unreadAnnouncements) {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, post_id, board_type, created_at, actor:users!notifications_actor_id_fkey(id, name)')
      .eq('recipient_id', session.userId)
      .eq('type', 'announcement')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Announcement popup lookup failed:', error.code);
      return NextResponse.json({ error: '공지 알림 조회에 실패했습니다.' }, { status: 503 });
    }
    return NextResponse.json({
      notifications: (data || []).map((item) => ({ ...item, body: notificationPreview(item.body, 240) })),
    });
  }

  // 전체 목록 (알림 페이지)
  const { notifications, unreadCount } = await loadNotifications(session);
  return NextResponse.json({ notifications, unreadCount });
}
