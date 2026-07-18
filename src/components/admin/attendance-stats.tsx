'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, Church, Wifi, Users, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeekSelector } from '@/components/prayer/week-selector';
import { getCurrentWeekSunday, formatWeekDate } from '@/lib/date-utils';

interface CellStat {
  id: string;
  name: string;
  memberCount: number;
  onsite: number;
  online: number;
  departmentMeeting: number;
  smallGroup: number;
  checked: number;
}

interface VillageStat extends CellStat {
  cells: CellStat[];
}

interface StatsData {
  weekStart: string;
  summary: CellStat;
  villages: VillageStat[];
}

const METRICS = [
  { key: 'onsite', label: '현장 출석', icon: Church, color: 'text-primary-600', bg: 'bg-primary-50' },
  { key: 'online', label: '온라인 예배', icon: Wifi, color: 'text-sky-600', bg: 'bg-sky-50' },
  { key: 'departmentMeeting', label: '부서집회', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'smallGroup', label: '소그룹', icon: UsersRound, color: 'text-emerald-600', bg: 'bg-emerald-50' },
] as const;

export function AttendanceStats() {
  const [currentSunday, setCurrentSunday] = useState<Date>(() => getCurrentWeekSunday());
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openVillage, setOpenVillage] = useState<string | null>(null);

  const load = useCallback(async (weekStart: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/attendance-stats?weekStart=${weekStart}`);
      const json = await res.json();
      if (!res.ok) setError(json.error || '통계를 불러오지 못했습니다.');
      else setData(json);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(formatWeekDate(currentSunday));
  }, [currentSunday, load]);

  const worshipTotal = data ? data.summary.onsite + data.summary.online : 0;

  return (
    <div className="space-y-3">
      <WeekSelector currentSunday={currentSunday} onChange={setCurrentSunday} />

      {loading && (
        <div className="flex justify-center py-16 text-stone-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      )}

      {error && !loading && (
        <div className="py-16 text-center text-sm text-stone-500">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          {/* 요약 카드 */}
          <div className="rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-100">예배 참석 합계 (현장+온라인)</p>
                <p className="mt-1 text-2xl font-bold">
                  {worshipTotal}
                  <span className="text-base font-normal text-primary-100"> / {data.summary.memberCount}명</span>
                </p>
              </div>
              <div className="text-right text-xs text-primary-100">
                <p>현장 {data.summary.onsite}</p>
                <p>온라인 {data.summary.online}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {METRICS.map((m) => {
              const Icon = m.icon;
              const value = data.summary[m.key as keyof CellStat] as number;
              return (
                <div key={m.key} className="rounded-xl border border-stone-200/80 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', m.bg)}>
                      <Icon size={16} className={m.color} />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">{m.label}</p>
                      <p className="text-lg font-bold text-stone-800">
                        {value}
                        <span className="text-xs font-normal text-stone-400">명</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 마을/소그룹별 */}
          <div className="space-y-2 pt-1">
            <p className="px-1 text-xs font-semibold text-stone-500">마을 · 소그룹별 현황</p>
            {data.villages.map((v) => {
              const isOpen = openVillage === v.id;
              return (
                <div key={v.id} className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
                  <button
                    onClick={() => setOpenVillage(isOpen ? null : v.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-800">{v.name}</span>
                        <span className="text-xs text-stone-400">{v.memberCount}명</span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-400">
                        현장 {v.onsite} · 온라인 {v.online} · 부서 {v.departmentMeeting} · 소그룹 {v.smallGroup}
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      className={cn('shrink-0 text-stone-400 transition-transform', isOpen && 'rotate-180')}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-stone-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-stone-50 text-[11px] text-stone-500">
                            <th className="px-3 py-2 text-left font-medium">소그룹</th>
                            <th className="px-1 py-2 text-center font-medium">인원</th>
                            <th className="px-1 py-2 text-center font-medium">현장</th>
                            <th className="px-1 py-2 text-center font-medium">온라인</th>
                            <th className="px-1 py-2 text-center font-medium">부서</th>
                            <th className="px-1 py-2 text-center font-medium">소그룹</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.cells.map((c) => (
                            <tr key={c.id} className="border-t border-stone-50 text-stone-700">
                              <td className="px-3 py-2 text-left">{c.name}</td>
                              <td className="px-1 py-2 text-center text-stone-400">{c.memberCount}</td>
                              <td className="px-1 py-2 text-center font-medium">{c.onsite}</td>
                              <td className="px-1 py-2 text-center text-sky-600">{c.online}</td>
                              <td className="px-1 py-2 text-center text-amber-600">{c.departmentMeeting}</td>
                              <td className="px-1 py-2 text-center text-emerald-600">{c.smallGroup}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
            {data.villages.length === 0 && (
              <p className="py-8 text-center text-xs text-stone-400">조직 데이터가 없습니다.</p>
            )}
          </div>

          <p className="pt-1 text-center text-xs text-stone-400">
            현장(1·2·3부)과 온라인은 중복 없이 각 1명으로 집계됩니다.
          </p>
        </>
      )}
    </div>
  );
}
