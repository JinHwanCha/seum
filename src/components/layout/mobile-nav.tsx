'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, UsersRound, Megaphone, MessageSquare, Heart } from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { href: '', label: '홈', icon: Home },
  { href: '/prayer', label: '소그룹', icon: UsersRound },
  { href: '/boards/notice', label: '공지', icon: Megaphone },
  { href: '/boards/sharing', label: '나눔', icon: MessageSquare },
  { href: '/boards/intercession', label: '중보', icon: Heart },
];

export function MobileNav() {
  const params = useParams();
  const pathname = usePathname();
  const basePath = `/${params.church}/${params.department}`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 warm-surface border-t border-stone-200/80 z-40 safe-bottom">
      <div className="flex items-center justify-around h-16">
        {MOBILE_NAV_ITEMS.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive =
            item.href === ''
              ? pathname === basePath || pathname === basePath + '/'
              : pathname.startsWith(href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 min-w-[56px] transition-colors',
                isActive ? 'text-primary-600' : 'text-stone-400'
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
