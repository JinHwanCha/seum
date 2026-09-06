import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { loadNotifications } from '@/lib/notifications';
import { NotificationList } from '@/components/notifications/notification-list';

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // 서버에서 미리 조회해 클라이언트 페칭 워터폴(마운트→요청→스켈레톤)을 제거한다.
  const { notifications } = await loadNotifications(session).catch(() => ({ notifications: [] }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900">알림</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          사역자 공지와 내 글에 달린 댓글·반응을 확인하세요.
        </p>
      </div>
      <NotificationList initialItems={notifications} />
    </div>
  );
}
