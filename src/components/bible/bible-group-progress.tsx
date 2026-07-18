'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, Trophy, ChevronDown, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';

type SortKey = 'rate' | 'recent';

interface Member {
  id: string;
  name: string;
  role: string;
  isMe: boolean;
  chaptersRead: number;
  lastReadAt: string | null;
}

interface Cell {
  id: string;
  name: string;
  members: Member[];
  totalRead: number;
}

interface Village {
  id: string;
  name: string;
  cells: Cell[];
  memberCount: number;
  totalRead: number;
}

function sortMembers(members: Member[], sort: SortKey): Member[] {
  const arr = [...members];
  if (sort === 'rate') {
    arr.sort(
      (a, b) =>
        b.chaptersRead - a.chaptersRead ||
        (b.lastReadAt || '').localeCompare(a.lastReadAt || '')
    );
  } else {
    arr.sort(
      (a, b) =>
        (b.lastReadAt || '').localeCompare(a.lastReadAt || '') ||
        b.chaptersRead - a.chaptersRead
    );
  }
  return arr;
}

function MemberRow({
  m,
  total,
  rank,
  maxRead,
}: {
  m: Member;
  total: number;
  rank?: number;
  maxRead: number;
}) {
  const percent = Math.round((m.chaptersRead / total) * 100);
  const barWidth = maxRead > 0 ? Math.round((m.chaptersRead / maxRead) * 100) : 0;
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        m.isMe ? 'border-primary-200 bg-primary-50/50' : 'border-stone-200/70 bg-white'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {rank !== undefined && (
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                rank === 1
                  ? 'bg-amber-100 text-amber-700'
                  : rank === 2
                    ? 'bg-stone-200 text-stone-600'
                    : rank === 3
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-stone-100 text-stone-400'
              )}
            >
              {rank}
            </span>
          )}
          <span className="truncate font-medium text-stone-800">{m.name}</span>
          {m.isMe && (
            <span className="shrink-0 rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
              나
            </span>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span className="text-sm">
            <span className="font-semibold text-stone-700">{m.chaptersRead}</span>
            <span className="text-stone-400">장 · {percent}%</span>
          </span>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn('h-full rounded-full', m.isMe ? 'bg-primary-500' : 'bg-emerald-400')}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-stone-400">
        {m.lastReadAt ? `최근 ${formatDate(m.lastReadAt)}` : '읽기 기록 없음'}
      </p>
    </div>
  );
}

export function BibleGroupProgress() {
  const [scope, setScope] = useState<'all' | 'cell'>('cell');
  const [members, setMembers] = useState<Member[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [unassigned, setUnassigned] = useState<Member[]>([]);
  const [total, setTotal] = useState(1189);
  const [scopeLabel, setScopeLabel] = useState('부서 전체 통독 현황');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('rate');
  const [openVillage, setOpenVillage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/bible/group-progress');
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || '현황을 불러오지 못했습니다.');
        } else {
          setTotal(json.total || 1189);
          if (json.scope === 'all') {
            setScope('all');
            setVillages(json.villages || []);
            setUnassigned(json.unassigned || []);
            setScopeLabel(json.scopeLabel || '부서 전체 통독 현황');
            setOpenVillage((json.villages || [])[0]?.id ?? null);
          } else {
            setScope('cell');
            setMembers(json.members || []);
          }
        }
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxReadAll = useMemo(() => {
    if (scope === 'cell') return Math.max(...members.map((m) => m.chaptersRead), 1);
    let mx = 1;
    villages.forEach((v) =>
      v.cells.forEach((c) =>
        c.members.forEach((m) => {
          if (m.chaptersRead > mx) mx = m.chaptersRead;
        })
      )
    );
    unassigned.forEach((m) => {
      if (m.chaptersRead > mx) mx = m.chaptersRead;
    });
    return mx;
  }, [scope, members, villages, unassigned]);

  const sortedCellMembers = useMemo(() => sortMembers(members, sort), [members, sort]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-stone-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-sm text-stone-500">{error}</div>;
  }

  const SortToggle = (
    <div className="flex rounded-lg border border-stone-200 p-0.5">
      <button
        onClick={() => setSort('rate')}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          sort === 'rate' ? 'bg-primary-600 text-white' : 'text-stone-500'
        )}
      >
        <TrendingUp size={13} /> 통독률순
      </button>
      <button
        onClick={() => setSort('recent')}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          sort === 'recent' ? 'bg-primary-600 text-white' : 'text-stone-500'
        )}
      >
        <Clock size={13} /> 최근순
      </button>
    </div>
  );

  // ─── 일반 성도 뷰 ───
  if (scope === 'cell') {
    if (members.length === 0) {
      return <div className="py-16 text-center text-sm text-stone-500">소속된 소그룹이 없습니다.</div>;
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-stone-500">
            <Trophy size={16} className="text-amber-500" /> 우리 소그룹 통독 현황
          </span>
          {SortToggle}
        </div>
        {sortedCellMembers.map((m, idx) => (
          <MemberRow key={m.id} m={m} total={total} rank={idx + 1} maxRead={maxReadAll} />
        ))}
        <p className="pt-1 text-center text-xs text-stone-400">전체 {total}장 기준</p>
      </div>
    );
  }

  // ─── 사역자 / 관리자 뷰 (마을 > 소그룹) ───
  const totalPeople = villages.reduce((s, v) => s + v.memberCount, 0) + unassigned.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-stone-500">
          <Trophy size={16} className="text-amber-500" /> {scopeLabel}
          <span className="text-stone-300">·</span>
          <span className="text-stone-400">{totalPeople}명</span>
        </span>
        {SortToggle}
      </div>

      {villages.map((v) => {
        const isOpen = openVillage === v.id;
        const avg = v.memberCount > 0 ? Math.round(v.totalRead / v.memberCount) : 0;
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
                  1인 평균 {avg}장 · 합계 {v.totalRead.toLocaleString()}장
                </p>
              </div>
              <ChevronDown
                size={18}
                className={cn('shrink-0 text-stone-400 transition-transform', isOpen && 'rotate-180')}
              />
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-stone-100 px-3 py-3">
                {v.cells
                  .filter((c) => c.members.length > 0)
                  .map((c) => (
                    <div key={c.id}>
                      <div className="mb-1.5 flex items-center gap-2 px-1">
                        <span className="text-xs font-semibold text-stone-600">{c.name}</span>
                        <span className="text-[11px] text-stone-400">{c.members.length}명</span>
                      </div>
                      <div className="space-y-2">
                        {sortMembers(c.members, sort).map((m) => (
                          <MemberRow key={m.id} m={m} total={total} maxRead={maxReadAll} />
                        ))}
                      </div>
                    </div>
                  ))}
                {v.cells.every((c) => c.members.length === 0) && (
                  <p className="py-2 text-center text-xs text-stone-400">구성원이 없습니다.</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white">
          <div className="border-b border-stone-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-stone-700">사역자 · 미배정</span>
            <span className="ml-2 text-xs text-stone-400">{unassigned.length}명</span>
          </div>
          <div className="space-y-2 p-3">
            {sortMembers(unassigned, sort).map((m) => (
              <MemberRow key={m.id} m={m} total={total} maxRead={maxReadAll} />
            ))}
          </div>
        </div>
      )}

      <p className="pt-1 text-center text-xs text-stone-400">
        전체 {total}장 기준 · 막대는 상대 진도입니다.
      </p>
    </div>
  );
}
