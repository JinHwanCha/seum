'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, UserCircle } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, logout } = useAuth();
  const params = useParams();

  if (!user) return null;

  return (
    <header className="warm-surface border-b border-stone-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href={`/${params.church}/${params.department}`}
          className="text-xl font-bold text-primary-700 tracking-tight"
        >
          세움
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/${params.church}/${params.department}/profile`}
            className="text-sm text-stone-600 hidden sm:block hover:text-primary-600 transition-colors"
          >
            {user.name}
          </Link>
          <Link
            href={`/${params.church}/${params.department}/profile`}
            className="sm:hidden p-2 rounded-lg text-stone-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="내 정보"
          >
            <UserCircle size={18} />
          </Link>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            title="로그아웃"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
