'use client';

import useSWR from 'swr';
import { useEffect } from 'react';
import { fetchSmallGroup, smallGroupCacheKey } from '@/lib/small-group-cache';
import type { SessionPayload } from '@/lib/types';
import { getNextWeek, getPreviousWeek } from '@/lib/date-utils';
import { useWeekPrefetch } from '@/components/prayer/use-week-prefetch';

const warmOptions = {
  dedupingInterval: 30000,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  keepPreviousData: false,
};

export function SmallGroupWarmer({ user, assignment, initialWeek, week }: {
  user: SessionPayload; assignment: string; initialWeek: string; week: string;
}) {
  const { data: structure, error: structureError } = useSWR(
    smallGroupCacheKey(user, `/api/small-group?weekStart=${initialWeek}&mode=structure`, assignment),
    fetchSmallGroup, warmOptions
  );
  const { data: prayerData, error: prayerError } = useSWR(
    smallGroupCacheKey(user, `/api/small-group?weekStart=${week}&mode=prayer`, assignment),
    fetchSmallGroup, warmOptions
  );
  const { data: attendanceData, error: attendanceError } = useSWR(
    smallGroupCacheKey(user, `/api/small-group?weekStart=${week}&attendanceOnly=true`, assignment),
    fetchSmallGroup, warmOptions
  );
  const prepareWeek = useWeekPrefetch(assignment);
  const currentWeekReady = Boolean(prayerData && attendanceData);
  useEffect(() => {
    if (!currentWeekReady) return;
    const [year, month, day] = week.split('-').map(Number);
    const sunday = new Date(year, month - 1, day);
    const previousWeek = getPreviousWeek(sunday);
    prepareWeek(previousWeek);
    prepareWeek(getPreviousWeek(previousWeek));
    prepareWeek(getNextWeek(sunday));
  }, [week, currentWeekReady, prepareWeek]);
  const cellId = structure?.currentUser?.cellId;
  const role = structure?.currentUser?.role;
  const cellIds: string[] = (structure?.villageCells || [])
    .flatMap((village: { cells: { id: string }[] }) => village.cells.map((cell) => cell.id));
  const monthStart = `${week.slice(0, 7)}-01`;
  const { error: treeError } = useSWR(
    cellId ? smallGroupCacheKey(user, `/api/small-group/tree?cellId=${cellId}&monthStart=${monthStart}`, assignment) : null,
    fetchSmallGroup, warmOptions
  );
  const { error: summaryError } = useSWR(
    (role === 'minister' || role === 'village_leader') && cellIds.length > 0
      ? smallGroupCacheKey(user, `/api/small-group/tree/summary?monthStart=${monthStart}&cellIds=${cellIds.join(',')}`, assignment)
      : null,
    fetchSmallGroup, warmOptions
  );
  useEffect(() => {
    for (const [name, error] of [
      ['structure', structureError], ['prayer', prayerError], ['attendance', attendanceError],
      ['tree', treeError], ['tree summary', summaryError],
    ]) {
      if (error) console.error(`Small group background ${name} preparation failed:`, error);
    }
  }, [structureError, prayerError, attendanceError, treeError, summaryError]);
  useEffect(() => {
    Promise.all([
      import('@/components/prayer/tree-growth'),
      import('@/components/prayer/tree-overview'),
      import('@/components/attendance/special-worship-check'),
    ]).catch((error: unknown) => console.error('Small group background tab module preparation failed:', error));
  }, []);
  return null;
}
