'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, Crown, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS_DEFAULT } from '@/lib/constants';
import {
  formatMonthKey,
  formatMonthLabel,
  getPreviousMonth,
  getNextMonth,
  isFutureMonth,
  getMonthWeeks,
} from '@/lib/date-utils';

interface MonthlyMember {
  id: string;
  name: string;
  role: string;
  birth_date?: string | null;
}

interface MonthlyPrayer {
  id: string;
  user_id: string;
  week_start: string;
  content: string;
  images: string[] | null;
  is_cell_only: boolean;
}

const birthYearLabel = (birthDate?: string | null) => {
  if (!birthDate) return '';
  return ` (${birthDate.substring(2, 4)})`;
};

export function MonthlyPrayerView({
  onImageClick,
}: {
  onImageClick: (images: string[], index: number) => void;
}) {
  const [month, setMonth] = useState(() => new Date());
  const monthKey = formatMonthKey(month);

  const { data, isLoading } = useSWR<{ members: MonthlyMember[]; prayers: MonthlyPrayer[] }>(
    `/api/prayer-requests/monthly?month=${monthKey}`,
    { keepPreviousData: true }
  );

  const members = data?.members || [];
  const prayers = data?.prayers || [];
  const weeks = getMonthWeeks(month);

  // user_id -> week_start -> prayer
  const byUserWeek: Record<string, Record<string, MonthlyPrayer>> = {};
  prayers.forEach((p) => {
    if (!byUserWeek[p.user_id]) byUserWeek[p.user_id] = {};
    byUserWeek[p.user_id][p.week_start] = p;
  });

  const canGoNext = !isFutureMonth(getNextMonth(month));

  return (
    <div className="space-y-2">
      {/* Month navigator */}
      <div className="flex items-center justify-between warm-surface rounded-xl border border-stone-200/80 px-4 py-3">
        <button
          onClick={() => setMonth(getPreviousMonth(month))}
          className="p-1.5 rounded-lg hover:bg-primary-50 text-stone-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium text-stone-900">{formatMonthLabel(month)}</span>
        <button
          onClick={() => canGoNext && setMonth(getNextMonth(month))}
          disabled={!canGoNext}
          className="p-1.5 rounded-lg hover:bg-primary-50 text-stone-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {isLoading && !data ? (
        <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm">소그룹이 배정되지 않았습니다.</div>
      ) : weeks.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm">해당 월의 기도제목이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const userPrayers = byUserWeek[m.id] || {};
            return (
              <div
                key={m.id}
                className="warm-surface rounded-xl border border-stone-200/80 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  {m.role === 'cell_leader' ? (
                    <Crown size={14} className="text-amber-500" />
                  ) : (
                    <User size={14} className="text-stone-400" />
                  )}
                  <span className="text-sm font-semibold text-stone-900">
                    {m.name}
                    {birthYearLabel(m.birth_date)}
                  </span>
                  <Badge variant={m.role === 'cell_leader' ? 'success' : 'default'}>
                    {ROLE_LABELS_DEFAULT[m.role]}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {weeks.map((w) => {
                    const prayer = userPrayers[w.sunday];
                    return (
                      <div key={w.sunday} className="flex gap-2">
                        <span className="shrink-0 mt-0.5 text-xs font-medium text-primary-600 w-12">
                          {w.weekNum}주차
                        </span>
                        <div className="flex-1 min-w-0">
                          {prayer ? (
                            <>
                              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                                {prayer.content}
                              </p>
                              {(prayer.images || []).length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-2">
                                  {(prayer.images as string[]).map((src, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => onImageClick(prayer.images as string[], idx)}
                                      className="block rounded-md overflow-hidden border border-stone-200 hover:opacity-90 transition-opacity"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={src} alt="" className="h-16 w-16 object-cover" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-stone-300 italic">미작성</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
