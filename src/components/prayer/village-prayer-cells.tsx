'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, ChevronDown, Crown, User } from 'lucide-react';
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

interface CellMemberLike {
  id: string;
  name: string;
  role: string;
  birth_date?: string | null;
}

interface CellPrayerLike {
  user_id: string;
  content: string;
  images?: string[] | null;
  is_cell_only?: boolean;
}

interface CellLike {
  id: string;
  name: string | null;
  leader_name?: string | null;
  members: CellMemberLike[];
  prayers: CellPrayerLike[];
}

interface VillageLike {
  id: string;
  name: string;
  cells: CellLike[];
}

interface MonthlyPrayer {
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

export function VillagePrayerCells({
  villages,
  showVillageHeader = false,
  expandKeyPrefix = '',
  onImageClick,
}: {
  villages: VillageLike[];
  showVillageHeader?: boolean;
  expandKeyPrefix?: string;
  onImageClick: (images: string[], index: number) => void;
}) {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [month, setMonth] = useState(() => new Date());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const monthKey = formatMonthKey(month);
  const { data: monthlyData, isLoading: monthlyLoading } = useSWR<{ prayers: MonthlyPrayer[] }>(
    view === 'month' ? `/api/small-group/monthly?month=${monthKey}` : null,
    { keepPreviousData: true }
  );

  const weeks = getMonthWeeks(month);
  // user_id -> week_start -> prayer
  const byUserWeek: Record<string, Record<string, MonthlyPrayer>> = {};
  (monthlyData?.prayers || []).forEach((p) => {
    if (!byUserWeek[p.user_id]) byUserWeek[p.user_id] = {};
    byUserWeek[p.user_id][p.week_start] = p;
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      const key = `${expandKeyPrefix}${id}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const canGoNext = !isFutureMonth(getNextMonth(month));

  return (
    <div className="space-y-2">
      {/* week/month toggle */}
      <div className="flex justify-end">
        <div className="flex gap-1 rounded-full bg-stone-100 p-0.5">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              view === 'week'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            이번주
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              view === 'month'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            월별
          </button>
        </div>
      </div>

      {/* month navigator */}
      {view === 'month' && (
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
      )}

      {view === 'month' && monthlyLoading && !monthlyData ? (
        <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>
      ) : (
        villages.map((village) => (
          <div key={village.id}>
            {showVillageHeader && (
              <h2 className="text-sm font-semibold text-stone-700 mb-2 px-1">
                {village.name} 마을
              </h2>
            )}
            <div className="space-y-2">
              {village.cells.map((cell) => {
                const isExpanded = expanded.has(`${expandKeyPrefix}${cell.id}`);
                const memberCount = cell.members.length;
                const prayerCount = cell.prayers.length;

                return (
                  <div
                    key={cell.id}
                    className="warm-surface rounded-xl border border-stone-200/80 overflow-hidden"
                  >
                    <button
                      onClick={() => toggle(cell.id)}
                      className="w-full flex flex-wrap items-center justify-between p-4 hover:bg-primary-50/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-stone-400" />
                        ) : (
                          <ChevronRight size={16} className="text-stone-400" />
                        )}
                        <span className="font-medium text-stone-900 text-sm">
                          {cell.name || '소그룹'}
                        </span>
                        {cell.leader_name && (
                          <span className="text-xs text-stone-500">목자: {cell.leader_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{memberCount}명</Badge>
                        {view === 'week' && (
                          <Badge variant={prayerCount === memberCount ? 'success' : 'warning'}>
                            기도 {prayerCount}/{memberCount}
                          </Badge>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-stone-100 p-4 space-y-3">
                        {cell.members.map((m) => {
                          const userWeeks = byUserWeek[m.id] || {};
                          const weekPrayer = cell.prayers.find((p) => p.user_id === m.id);
                          return (
                            <div key={m.id} className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {m.role === 'cell_leader' ? (
                                  <Crown size={14} className="text-amber-500" />
                                ) : (
                                  <User size={14} className="text-stone-400" />
                                )}
                                <span className="text-sm font-medium text-stone-900">
                                  {m.name}
                                  {birthYearLabel(m.birth_date)}
                                </span>
                                <Badge variant={m.role === 'cell_leader' ? 'success' : 'default'}>
                                  {ROLE_LABELS_DEFAULT[m.role]}
                                </Badge>
                                {view === 'week' && weekPrayer?.is_cell_only && (
                                  <Badge variant="warning">소그룹공개</Badge>
                                )}
                              </div>

                              {view === 'week' ? (
                                weekPrayer ? (
                                  <div className="ml-6 bg-primary-50/30 rounded-lg p-3">
                                    <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                                      {weekPrayer.content}
                                    </p>
                                    {(weekPrayer.images || []).length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {(weekPrayer.images as string[]).map((src, idx) => (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => onImageClick(weekPrayer.images as string[], idx)}
                                            className="block rounded-md overflow-hidden border border-stone-200 hover:opacity-90 transition-opacity"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={src} alt="" className="h-16 w-16 object-cover" />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="ml-6 text-xs text-stone-400 italic">기도제목 미작성</p>
                                )
                              ) : weeks.length === 0 ? (
                                <p className="ml-6 text-xs text-stone-400 italic">해당 월 데이터 없음</p>
                              ) : (
                                <div className="ml-6 space-y-1.5">
                                  {weeks.map((w) => {
                                    const prayer = userWeeks[w.sunday];
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
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
