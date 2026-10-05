'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/date-utils';
import { requestPushApi } from '@/lib/native-push';

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
  const [error, setError] = useState<string | null>(null);
  const basePath = `/${params.church}/${params.department}`;

  useEffect(() => {
    let active = true;
    requestPushApi('/api/notifications?unreadAnnouncements=1', { cache: 'no-store' })
      .then((data) => {
        if (!active) return;
        if (!Array.isArray(data.notifications)) throw new Error('공지 알림 응답이 올바르지 않습니다.');
        const list: AnnouncementItem[] = data.notifications;
        if (list.length > 0) {
          setItems(list);
          setOpen(true);
        }
      })
      .catch((cause: unknown) => {
        console.error('Announcement popup load failed:', cause);
        if (active) setError('공지 알림을 불러오지 못했습니다. 알림 목록에서 다시 확인해주세요.');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
    // 닫으면 다시 뜨지 않도록 공지 알림을 읽음 처리
    requestPushApi('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: items.map((i) => i.id) }),
    }).then((data) => {
      if (data.success !== true) throw new Error('공지 읽음 처리가 완료되지 않았습니다.');
      window.dispatchEvent(new Event('seum-notifications-changed'));
    }).catch((cause: unknown) => {
      console.error('Announcement read update failed:', cause);
      setError('공지 읽음 처리에 실패했습니다. 알림 목록에서 다시 확인해주세요.');
    });
  };

  if (items.length === 0 && !error) return null;

  return (
    <>
    {error && <p role="alert" className="m-3 text-xs text-red-600">{error}</p>}
    <Modal isOpen={open} onClose={handleClose} title="새로운 공지">
      <div className="space-y-3">
        {items.map((item) => {
          const href =
            item.post_id && item.board_type
              ? `${basePath}/boards/${item.board_type}/${item.post_id}`
              : null;
          const inner = (
            <div className="flex gap-3 p-3 rounded-lg bg-primary-50/60 border border-primary-100">
              <div className="shrink-0 w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                <Image src="/push-icon.png" alt="세움" width={36} height={36} unoptimized className="rounded-xl" />
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
    </>
  );
}
