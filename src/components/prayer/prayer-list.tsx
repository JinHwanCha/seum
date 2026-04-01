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
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">이번 주 기도제목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prayers.map((prayer) => (
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
