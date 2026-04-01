'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, logout } = useAuth();
  const params = useParams();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href={`/${params.church}/${params.department}`}
          className="text-xl font-bold text-primary-600 tracking-tight"
        >
          세움
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="로그아웃"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
