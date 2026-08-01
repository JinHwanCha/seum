'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const params = useParams();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/notifications?countOnly=1');
        if (!res.ok) return;
        const data = await res.json();
        if (active) setUnread(data.unreadCount ?? 0);
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(id);
    };
    // 경로가 바뀌면(알림 페이지 방문 후 복귀 등) 다시 조회
  }, [pathname]);

  return (
    <Link
      href={`/${params.church}/${params.department}/notifications`}
      className="relative p-2 rounded-lg text-stone-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
      title="알림"
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
