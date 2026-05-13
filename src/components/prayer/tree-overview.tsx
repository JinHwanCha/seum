'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { PillTabs } from '@/components/ui/pill-tabs';
import { Badge } from '@/components/ui/badge';

interface CellInfo {
  id: string;
  name: string | null;
  leader_name: string | null;
  members: { id: string; name: string }[];
}

interface VillageGroup {
  id: string;
  name: string;
  cells: CellInfo[];
}

interface Summary {
  cellId: string;
  monthScore: number;
  memberCount: number;
  weekCount: number;
}

interface Props {
  villageCells: VillageGroup[];
  weekStart: string;
  showVillageFilter: boolean; // minister: true, village_leader: false
}

type Health = 'wilted' | 'okay' | 'good' | 'excellent';

function healthOf(score: number): Health {
  if (score >= 0.75) return 'excellent';
  if (score >= 0.5) return 'good';
  if (score >= 0.25) return 'okay';
  return 'wilted';
}

const HEALTH_INFO: Record<Health, { emoji: string; label: string; bar: string; text: string; bg: string }> = {
  excellent: { emoji: '🌳', label: '풍성함', bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  good:      { emoji: '🌿', label: '건강함', bar: 'bg-green-500',   text: 'text-green-700',   bg: 'bg-green-50'   },
  okay:      { emoji: '🍃', label: '자라는중', bar: 'bg-amber-400',  text: 'text-amber-700',   bg: 'bg-amber-50'   },
  wilted:    { emoji: '🥀', label: '돌봄필요', bar: 'bg-rose-400',    text: 'text-rose-700',    bg: 'bg-rose-50'    },
};

function monthStartOf(weekStart: string): string {
  const [y, m] = weekStart.split('-');
  return `${y}-${m}-01`;
}

export function TreeOverview({ villageCells, weekStart, showVillageFilter }: Props) {
  const [villageFilter, setVillageFilter] = useState<string>('__all__');

  const allCells = useMemo(() => {
    const list: { cell: CellInfo; village: VillageGroup }[] = [];
    villageCells.forEach((v) => v.cells.forEach((c) => list.push({ cell: c, village: v })));
    return list;
  }, [villageCells]);

  const cellIds = useMemo(() => allCells.map((x) => x.cell.id), [allCells]);
  const monthStart = monthStartOf(weekStart);

  const swrKey = cellIds.length > 0
    ? `/api/small-group/tree/summary?monthStart=${monthStart}&cellIds=${cellIds.join(',')}`
    : null;
  const { data, isLoading } = useSWR<{ summaries: Summary[] }>(swrKey);

  const scoreMap = useMemo(() => {
    const map = new Map<string, Summary>();
    (data?.summaries ?? []).forEach((s) => map.set(s.cellId, s));
    return map;
  }, [data]);

  const villageTabs = useMemo(() => {
    if (!showVillageFilter) return [];
    return [
      { key: '__all__', label: '전체' },
      ...villageCells.map((v) => ({ key: v.id, label: v.name })),
    ];
  }, [villageCells, showVillageFilter]);

  const filteredVillages = useMemo(() => {
    if (!showVillageFilter || villageFilter === '__all__') return villageCells;
    return villageCells.filter((v) => v.id === villageFilter);
  }, [villageCells, villageFilter, showVillageFilter]);

  const monthLabel = (() => {
    const [y, m] = monthStart.split('-');
    return `${y}년 ${parseInt(m, 10)}월`;
  })();

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900">소그룹 나무 현황</h2>
          <p className="text-xs text-stone-500">{monthLabel} · 누적 참여도 기준</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-stone-500">
          <span>🌳풍성</span>
          <span>🌿건강</span>
          <span>🍃자라는중</span>
          <span>🥀돌봄</span>
        </div>
      </div>

      {showVillageFilter && villageTabs.length > 1 && (
        <PillTabs tabs={villageTabs} activeKey={villageFilter} onChange={setVillageFilter} />
      )}

      {isLoading && !data ? (
        <div className="text-center py-6 text-sm text-stone-400">불러오는 중...</div>
      ) : filteredVillages.every((v) => v.cells.length === 0) ? (
        <div className="text-center py-8 text-sm text-stone-400">소그룹이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {filteredVillages.map((village) => (
            <div key={village.id} className="space-y-1.5">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-stone-700">{village.name}</h3>
                <Badge variant="default">{village.cells.length}개 소그룹</Badge>
              </div>
              <div className="space-y-1">
                {village.cells.map((cell) => {
                  const sum = scoreMap.get(cell.id);
                  const score = sum?.monthScore ?? 0;
                  const health = healthOf(score);
                  const info = HEALTH_INFO[health];
                  const memberCount = sum?.memberCount ?? cell.members.length;
                  return (
                    <div
                      key={cell.id}
                      className={`flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-2 ${info.bg}`}
                    >
                      <span className="text-2xl leading-none">{info.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-stone-900 truncate">
                            {cell.name || '(이름없음)'}
                          </span>
                          {cell.leader_name && (
                            <span className="text-[11px] text-stone-500">목자 {cell.leader_name}</span>
                          )}
                          <span className="text-[11px] text-stone-500">· {memberCount}명</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                            <div
                              className={`h-full ${info.bar} transition-all`}
                              style={{ width: `${Math.min(100, Math.round(score * 100))}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-semibold ${info.text} shrink-0 w-20 text-right`}>
                            {info.label} {Math.round(score * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
