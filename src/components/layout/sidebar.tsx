'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { canAccessAdmin } from '@/lib/permissions';
import {
  Home,
  HandHeart,
  Megaphone,
  MessageSquare,
  Users,
  Heart,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '', label: '홈', icon: Home },
  { href: '/prayer', label: '기도제목', icon: HandHeart },
  { href: '/boards/notice', label: '공지', icon: Megaphone },
  { href: '/boards/sharing', label: '나눔', icon: MessageSquare },
  { href: '/boards/gathering', label: '모임', icon: Users },
  { href: '/boards/intercession', label: '중보기도', icon: Heart },
];

export function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const { user } = useAuth();

  const basePath = `/${params.church}/${params.department}`;
  const isAdmin = user ? canAccessAdmin(user.role as any, user.isBureauLeader || user.isBureauMember, user.isAdmin) : false;

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 min-h-[calc(100vh-3.5rem)]">
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="border-t border-gray-200 my-3" />
            <Link
              href={`${basePath}/admin`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                pathname.startsWith(`${basePath}/admin`)
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Settings size={18} />
              <span>관리</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
