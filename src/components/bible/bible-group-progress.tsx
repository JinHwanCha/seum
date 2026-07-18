'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  name: string;
  isMe: boolean;
  chaptersRead: number;
}

export function BibleGroupProgress() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(1189);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/bible/group-progress');
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || '현황을 불러오지 못했습니다.');
        } else {
          setMembers(json.members || []);
          setTotal(json.total || 1189);
        }
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  if (members.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-stone-500">
        소속된 소그룹이 없습니다.
      </div>
    );
  }

  const maxRead = Math.max(...members.map((m) => m.chaptersRead), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1 text-sm text-stone-500">
        <Trophy size={16} className="text-amber-500" />
        우리 소그룹 통독 현황
      </div>

      {members.map((m, idx) => {
        const percent = Math.round((m.chaptersRead / total) * 100);
        const barWidth = Math.round((m.chaptersRead / maxRead) * 100);
        return (
          <div
            key={m.id}
            className={cn(
              'rounded-xl border p-3.5',
              m.isMe ? 'border-primary-200 bg-primary-50/50' : 'border-stone-200/80 bg-white'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    idx === 0
                      ? 'bg-amber-100 text-amber-700'
                      : idx === 1
                        ? 'bg-stone-200 text-stone-600'
                        : idx === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-stone-100 text-stone-400'
                  )}
                >
                  {idx + 1}
                </span>
                <span className="flex items-center gap-1 font-medium text-stone-800">
                  {m.name}
                  {m.isMe && (
                    <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                      나
                    </span>
                  )}
                </span>
              </div>
              <span className="text-sm text-stone-500">
                <span className="font-semibold text-stone-700">{m.chaptersRead}</span>장 · {percent}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className={cn('h-full rounded-full', m.isMe ? 'bg-primary-500' : 'bg-emerald-400')}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}

      <p className="pt-1 text-center text-xs text-stone-400">
        전체 {total}장 기준 · 막대는 소그룹 내 상대 진도입니다.
      </p>
    </div>
  );
}
