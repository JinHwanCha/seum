'use client';

import { PrayerCard } from './prayer-card';
import type { PrayerRequest, SessionPayload } from '@/lib/types';

interface PrayerListProps {
  prayers: PrayerRequest[];
  session: SessionPayload;
  weekStart: string;
  onUpdated: () => void;
  groupByVillage?: boolean;
}

export function PrayerList({ prayers, session, weekStart, onUpdated, groupByVillage }: PrayerListProps) {
  if (prayers.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400">
        <p className="text-sm">이번 주 기도제목이 없습니다.</p>
      </div>
    );
  }

  // 멤버(작성자) 이름순으로 정렬해 보여준다.
  const sorted = [...prayers].sort((a, b) =>
    ((a.user as any)?.name || '').localeCompare((b.user as any)?.name || '', 'ko')
  );

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((prayer) => (
        <PrayerCard
          key={prayer.id}
          prayer={prayer}
          session={session}
          weekStart={weekStart}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}
