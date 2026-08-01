'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessageSquare, Heart, Megaphone, Bell } from 'lucide-react';
import { formatRelativeTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const TYPE_ICON = {
  comment: MessageSquare,
  reaction: Heart,
  announcement: Megaphone,
} as const;

const TYPE_STYLE = {
  comment: 'bg-emerald-50 text-emerald-600',
  reaction: 'bg-rose-50 text-rose-600',
  announcement: 'bg-primary-50 text-primary-600',
} as const;

export function NotificationList() {
  const params = useParams();
  const basePath = `/${params.church}/${params.department}`;
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 페이지 진입 시 전체 읽음 처리 (UI 는 로컬로 갱신)
  useEffect(() => {
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, []);

  const hrefFor = (n: Notification) =>
    n.post_id && n.board_type ? `${basePath}/boards/${n.board_type}/${n.post_id}` : null;

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-stone-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-400">
        <Bell size={40} className="mb-3 opacity-40" />
        <p className="text-sm">받은 알림이 없어요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((n) => {
        const Icon = TYPE_ICON[n.type] ?? Bell;
        const href = hrefFor(n);
        const body = (
          <div
            className={cn(
              'flex gap-3 p-3 rounded-xl border transition-colors',
              n.is_read
                ? 'bg-white border-stone-100'
                : 'bg-primary-50/40 border-primary-100'
            )}
          >
            <div
              className={cn(
                'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                TYPE_STYLE[n.type] ?? 'bg-stone-100 text-stone-500'
              )}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-900">{n.title}</p>
              {n.body && (
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                  {n.body}
                </p>
              )}
              <p className="text-[11px] text-stone-400 mt-1">
                {formatRelativeTime(n.created_at)}
              </p>
            </div>
            {!n.is_read && (
              <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </div>
        );
        return href ? (
          <Link key={n.id} href={href} className="block">
            {body}
          </Link>
        ) : (
          <div key={n.id}>{body}</div>
        );
      })}
    </div>
  );
}
