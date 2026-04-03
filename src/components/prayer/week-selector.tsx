'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatWeekLabel, formatWeekDate, getPreviousWeek, getNextWeek, isFutureWeek } from '@/lib/date-utils';

interface WeekSelectorProps {
  currentSunday: Date;
  onChange: (sunday: Date) => void;
}

export function WeekSelector({ currentSunday, onChange }: WeekSelectorProps) {
  const nextWeek = getNextWeek(currentSunday);
  const canGoNext = !isFutureWeek(nextWeek);

  return (
    <div className="flex items-center justify-between warm-surface rounded-xl border border-stone-200/80 px-4 py-3">
      <button
        onClick={() => onChange(getPreviousWeek(currentSunday))}
        className="p-1.5 rounded-lg hover:bg-primary-50 text-stone-600 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-sm font-medium text-stone-900">
        {formatWeekLabel(currentSunday)}
      </span>
      <button
        onClick={() => canGoNext && onChange(nextWeek)}
        disabled={!canGoNext}
        className="p-1.5 rounded-lg hover:bg-primary-50 text-stone-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
