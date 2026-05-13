import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';
import {
  getMembers,
  getResetRequests,
  getVillagesWithCells,
} from '@/lib/admin-data';
import type { Role } from '@/lib/types';
import MembersClient from './members-client';

interface PageProps {
  params: { church: string; department: string };
  searchParams: { tab?: string };
}

type TabKey = 'pending' | 'all' | 'graduated' | 'reset';

function resolveTab(tab?: string): TabKey {
  if (tab === 'pending' || tab === 'graduated' || tab === 'reset') return tab;
  return 'all';
}

async function MembersData({
  tab,
  basePath,
}: {
  tab: TabKey;
  basePath: string;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!canAccessAdmin(session.role as Role, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return <div className="text-center py-12 text-stone-400 text-sm">접근 권한이 없습니다.</div>;
  }

  // 모든 데이터 병렬 prefetch
  if (tab === 'reset') {
    const [resetRequests, villages] = await Promise.all([
      getResetRequests(session),
      getVillagesWithCells(session),
    ]);
    return (
      <MembersClient
        tab={tab}
        basePath={basePath}
        members={[]}
        villages={villages}
        resetRequests={resetRequests}
      />
    );
  }

  const status = tab === 'pending' ? 'pending' : tab === 'graduated' ? 'graduated' : 'all';
  const [members, villages, resetRequests] = await Promise.all([
    getMembers(session, status),
    getVillagesWithCells(session),
    getResetRequests(session),
  ]);

  return (
    <MembersClient
      tab={tab}
      basePath={basePath}
      members={members}
      villages={villages}
      resetRequests={resetRequests}
    />
  );
}

function MembersSkeleton() {
  return (
    <div className="space-y-3">
      <div className="animate-pulse h-10 bg-stone-100 rounded-xl" />
      <div className="animate-pulse h-24 bg-stone-100 rounded-xl" />
      <div className="animate-pulse h-24 bg-stone-100 rounded-xl" />
      <div className="animate-pulse h-24 bg-stone-100 rounded-xl" />
    </div>
  );
}

export default function MembersPage({ params, searchParams }: PageProps) {
  const tab = resolveTab(searchParams.tab);
  const basePath = `/${params.church}/${params.department}`;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-900">회원 관리</h1>
      <Suspense key={tab} fallback={<MembersSkeleton />}>
        <MembersData tab={tab} basePath={basePath} />
      </Suspense>
    </div>
  );
}
