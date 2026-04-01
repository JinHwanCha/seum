'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { WeekSelector } from '@/components/prayer/week-selector';
import { PrayerForm } from '@/components/prayer/prayer-form';
import { PrayerList } from '@/components/prayer/prayer-list';
import { Card, CardTitle } from '@/components/ui/card';
import { getCurrentWeekSunday, formatWeekDate } from '@/lib/date-utils';
import type { PrayerRequest } from '@/lib/types';

export default function PrayerPage() {
  const { user } = useAuth();
  const [currentSunday, setCurrentSunday] = useState(() => getCurrentWeekSunday());
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [myPrayer, setMyPrayer] = useState<PrayerRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStart = formatWeekDate(currentSunday);

  const fetchPrayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prayer-requests?weekStart=${weekStart}`);
      if (res.ok) {
        const data = await res.json();
        setPrayers(data.prayers || []);
        setMyPrayer(data.myPrayer || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">기도제목</h1>

      <WeekSelector currentSunday={currentSunday} onChange={setCurrentSunday} />

      {/* My prayer request */}
      <Card>
        <CardTitle className="text-base">나의 기도제목</CardTitle>
        <PrayerForm
          weekStart={weekStart}
          existingContent={myPrayer?.content}
          existingId={myPrayer?.id}
          onSaved={fetchPrayers}
        />
      </Card>

      {/* Others' prayer requests */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">공동체 기도제목</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
        ) : (
          <PrayerList
            prayers={prayers.filter((p) => p.user_id !== user.userId)}
            session={user}
            weekStart={weekStart}
            onUpdated={fetchPrayers}
          />
        )}
      </div>
    </div>
  );
}
