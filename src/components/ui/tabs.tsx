'use client';

import { cn } from '@/lib/utils';
import { useDragScroll } from '@/hooks/use-drag-scroll';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  const scrollRef = useDragScroll<HTMLElement>();
  return (
    <div className={cn('border-b border-stone-200 min-w-0 w-full', className)}>
      <nav
        ref={scrollRef}
        className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide cursor-grab select-none touch-pan-x"
        aria-label="Tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'whitespace-nowrap shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeKey === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs',
                  activeKey === tab.key
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-stone-100 text-stone-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
