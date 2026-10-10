'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useTransition, type ComponentProps, type ReactNode } from 'react';

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

export function NavigationLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const navigate = useContext(NavigationContext);
  return <Link {...props} onClick={(event) => {
    onClick?.(event);
    if (!navigate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || props.target || props.download || props.scroll === false ||
        typeof props.href !== 'string' || !props.href.startsWith('/') || props.href.startsWith('//')) return;
    event.preventDefault();
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (props.href === current) return;
    navigate(props.href, Boolean(props.replace));
  }} />;
}
