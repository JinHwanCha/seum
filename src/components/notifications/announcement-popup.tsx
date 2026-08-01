'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Megaphone, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/date-utils';

interface AnnouncementItem {
  id: string;
  title: string;
  body: string | null;
  post_id: string | null;
  board_type: string | null;
  created_at: string;
  actor?: { id: string; name: string } | null;
}

export function AnnouncementPopup() {
  const params = useParams();
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [open, setOpen] = useState(false);
  const basePath = `/${params.church}/${params.department}`;

  useEffect(() => {
    let active = true;
    fetch('/api/notifications?unreadAnnouncements=1')
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((data) => {
        if (!active) return;
        const list: AnnouncementItem[] = data.notifications || [];
        if (list.length > 0) {
          setItems(list);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
    // 닫으면 다시 뜨지 않도록 공지 알림을 읽음 처리
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: items.map((i) => i.id) }),
    }).catch(() => {});
  };

  if (items.length === 0) return null;

  return (
    <Modal isOpen={open} onClose={handleClose} title="📢 새로운 공지">
      <div className="space-y-3">
        {items.map((item) => {
          const href =
            item.post_id && item.board_type
              ? `${basePath}/boards/${item.board_type}/${item.post_id}`
              : null;
          const inner = (
            <div className="flex gap-3 p-3 rounded-lg bg-primary-50/60 border border-primary-100">
              <div className="shrink-0 w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                <Megaphone size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900 truncate">{item.title}</p>
                {item.body && (
                  <p className="text-xs text-stone-600 mt-0.5 line-clamp-3 whitespace-pre-wrap">
                    {item.body}
                  </p>
                )}
                <p className="text-[11px] text-stone-400 mt-1">
                  {item.actor?.name ? `${item.actor.name} · ` : ''}
                  {formatRelativeTime(item.created_at)}
                </p>
              </div>
            </div>
          );
          return href ? (
            <Link key={item.id} href={href} onClick={handleClose} className="block">
              {inner}
            </Link>
          ) : (
            <div key={item.id}>{inner}</div>
          );
        })}

        <Link
          href={`${basePath}/notifications`}
          onClick={handleClose}
          className="flex items-center justify-center gap-1 py-2.5 text-sm font-medium text-primary-600 hover:text-primary-700 border-t border-stone-100"
        >
          알림 전체보기
          <ChevronRight size={16} />
        </Link>
      </div>
    </Modal>
  );
}
