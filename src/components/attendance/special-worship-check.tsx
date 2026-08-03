'use client';

import { cn } from '@/lib/utils';
import { Church, Wifi, Sunrise } from 'lucide-react';
import type { Attendance, WorshipMode } from '@/lib/types';

const MODE_OPTIONS: { value: WorshipMode | null; label: string }[] = [
  { value: null, label: '미참석' },
  { value: '현장', label: '현장' },
  { value: '온라인', label: '온라인' },
];

// 단일 예배(수요/센터워십)
const SINGLE_SERVICES: { field: keyof Attendance; label: string; desc: string }[] = [
  { field: 'wednesday_worship', label: '수요예배', desc: '수요일 저녁 예배' },
  { field: 'friday_worship', label: '센터워십', desc: '금요 센터워십' },
];

// 새벽기도 월~금 일별
const DAWN_DAYS: { field: keyof Attendance; label: string }[] = [
  { field: 'dawn_mon', label: '월' },
  { field: 'dawn_tue', label: '화' },
  { field: 'dawn_wed', label: '수' },
  { field: 'dawn_thu', label: '목' },
  { field: 'dawn_fri', label: '금' },
];

interface SpecialWorshipCheckProps {
  weekStart: string;
  userId: string;
  attendance?: Attendance | null;
  onChange: (field: string, value: unknown) => void;
}

// 특별예배(수요/센터워십/새벽기도) 본인 출석 자가 체크
export function SpecialWorshipCheck({
  weekStart,
  userId,
  attendance,
  onChange,
}: SpecialWorshipCheckProps) {
  const save = (field: string, value: WorshipMode | null) => {
    onChange(field, value);
    fetch('/api/attendance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, weekStart, field, value }),
    }).catch(() => {});
  };

  const dawnDoneCount = DAWN_DAYS.filter(
    (d) => (attendance?.[d.field] as WorshipMode | null) ?? null
  ).length;

  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-stone-500">
        선택 예배는 스스로 출석을 체크할 수 있어요.
      </p>

      {/* 수요예배 / 센터워십 */}
      {SINGLE_SERVICES.map((svc) => {
        const current = (attendance?.[svc.field] as WorshipMode | null) ?? null;
        return (
          <div
            key={svc.field as string}
            className="warm-surface rounded-xl border border-stone-200/80 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              {current === '온라인' ? (
                <Wifi size={16} className="text-sky-500" />
              ) : (
                <Church size={16} className="text-primary-500" />
              )}
              <span className="text-sm font-semibold text-stone-800">{svc.label}</span>
              <span className="text-xs text-stone-400">{svc.desc}</span>
            </div>
            <div className="flex gap-2">
              {MODE_OPTIONS.map((opt) => {
                const isActive = opt.value === null ? !current : current === opt.value;
                return (
                  <button
                    key={opt.label}
                    onClick={() => save(svc.field as string, opt.value)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? opt.value === null
                          ? 'bg-stone-200 text-stone-600'
                          : opt.value === '온라인'
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'bg-primary-500 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 새벽기도 (월~금 일별) */}
      <div className="warm-surface rounded-xl border border-stone-200/80 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sunrise size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-stone-800">새벽기도</span>
          <span className="text-xs text-stone-400">월~금 일별 체크</span>
          <span className="ml-auto text-xs font-medium text-amber-600">{dawnDoneCount}/5일</span>
        </div>
        <div className="space-y-1.5">
          {DAWN_DAYS.map((day) => {
            const current = (attendance?.[day.field] as WorshipMode | null) ?? null;
            return (
              <div key={day.field as string} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    current ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'
                  )}
                >
                  {day.label}
                </span>
                <div className="flex flex-1 gap-1.5">
                  {MODE_OPTIONS.map((opt) => {
                    const isActive = opt.value === null ? !current : current === opt.value;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => save(day.field as string, opt.value)}
                        className={cn(
                          'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          isActive
                            ? opt.value === null
                              ? 'bg-stone-200 text-stone-600'
                              : opt.value === '온라인'
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'bg-primary-500 text-white shadow-sm'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
