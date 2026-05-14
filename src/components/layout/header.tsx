'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, UserCircle, Shield } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, logout } = useAuth();
  const params = useParams();

  if (!user) {
    return (
      <header className="warm-surface border-b border-stone-200/80 sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="text-xl font-bold text-primary-700 tracking-tight">세움</div>
          <div className="w-20 h-5 bg-stone-200 rounded-md animate-pulse" />
        </div>
      </header>
    );
  }

  // 마을장 이상(사역자/국장/관리자 포함) admin 버튼 노출
  const isBureau = user.isBureauLeader || user.isBureauMember;
  const isAdmin = user.isAdmin;
  const isVillageLeaderOrAbove =
    user.role === 'minister' || user.role === 'village_leader' || isBureau || isAdmin;

  return (
    <header className="warm-surface border-b border-stone-200/80 sticky top-0 z-40">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link
          href={`/${params.church}/${params.department}`}
          className="text-xl font-bold text-primary-700 tracking-tight"
        >
          세움
        </Link>
        <div className="flex items-center gap-3">
          {/* 모바일: admin 버튼 */}
          {isVillageLeaderOrAbove && (
            <Link
              href={`/${params.church}/${params.department}/admin`}
              className="sm:hidden p-2 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
              title="관리자"
            >
              <Shield size={18} />
            </Link>
          )}
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
