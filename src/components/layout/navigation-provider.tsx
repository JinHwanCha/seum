'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useTransition, type ComponentProps, type ReactNode } from 'react';
import { useBoardPrefetch } from '@/components/board/use-board-prefetch';

const NavigationContext = createContext<((href: string, replace: boolean) => void) | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <NavigationContext.Provider value={(href, replace) => {
      startTransition(() => { if (replace) router.replace(href); else router.push(href); });
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function NavigationLink({ onClick, onMouseEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof Link>) {
  const navigate = useContext(NavigationContext);
  const prefetch = useBoardPrefetch();
  return <Link {...props}
    onMouseEnter={(event) => { onMouseEnter?.(event); prefetch(props.href); }}
    onFocus={(event) => { onFocus?.(event); prefetch(props.href); }}
    onTouchStart={(event) => { onTouchStart?.(event); prefetch(props.href); }}
    onClick={(event) => {
    onClick?.(event);
    if (!navigate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || props.target || props.download || props.scroll === false ||
        typeof props.href !== 'string' || !props.href.startsWith('/') || props.href.startsWith('//')) return;
    event.preventDefault();
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (props.href === current) return;
    prefetch(props.href);
    navigate(props.href, Boolean(props.replace));
  }} />;
}
