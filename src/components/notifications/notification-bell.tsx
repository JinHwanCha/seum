'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { requestPushApi } from '@/lib/native-push';

export function NotificationBell() {
  const params = useParams();
  const { user } = useAuth();
  const { data, error, mutate } = useSWR(
    user ? ['notification-count', user.userId, user.departmentId, user.exp] : null,
    async () => {
      const result = await requestPushApi('/api/notifications?countOnly=1', { cache: 'no-store' });
      if (typeof result.unreadCount !== 'number') throw new Error('알림 개수 응답이 올바르지 않습니다.');
      return result.unreadCount;
    },
    { refreshInterval: 60000, dedupingInterval: 15000, revalidateOnFocus: true, keepPreviousData: false }
  );
  const unread = data || 0;

  useEffect(() => {
    const load = () => { mutate().catch((cause: unknown) => console.error('Notification count update failed:', cause)); };
    window.addEventListener('seum-notifications-changed', load);
    return () => {
      window.removeEventListener('seum-notifications-changed', load);
    };
  }, [mutate]);

  useEffect(() => {
    if (error) console.error('Notification count lookup failed:', error);
  }, [error]);

  return (
    <Link
      href={`/${params.church}/${params.department}/notifications`}
      className="relative p-2 rounded-lg text-stone-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
      title={error ? '알림 개수를 갱신하지 못했습니다. 알림 목록에서 확인해주세요.' : '알림'}
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
