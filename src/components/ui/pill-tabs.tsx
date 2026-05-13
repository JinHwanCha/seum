'use client';

import { cn } from '@/lib/utils';
import { useDragScroll } from '@/hooks/use-drag-scroll';

interface PillTab {
  key: string;
  label: string;
}

interface PillTabsProps {
  tabs: PillTab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function PillTabs({ tabs, activeKey, onChange, className }: PillTabsProps) {
  const ref = useDragScroll<HTMLDivElement>();
  return (
    <div className={cn('min-w-0 w-full overflow-hidden', className)}>
      <div
        ref={ref}
        className="flex gap-1.5 pb-1 -mx-1 px-1 overflow-x-auto scrollbar-hide cursor-grab select-none touch-pan-x"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              activeKey === tab.key
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
