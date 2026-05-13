'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MemberList } from '@/components/admin/member-list';
import { ResetRequestList } from '@/components/admin/reset-request-list';
import type { User } from '@/lib/types';
import type { VillageWithCells } from '@/lib/admin-data';

type TabKey = 'pending' | 'all' | 'graduated' | 'reset';

interface ResetRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  user: { id: string; name: string; phone: string | null };
}

interface Props {
  tab: TabKey;
  basePath: string;
  members: User[];
  villages: VillageWithCells[];
  resetRequests: ResetRequest[];
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '승인 대기' },
  { key: 'all', label: '전체 회원' },
  { key: 'graduated', label: '졸업' },
  { key: 'reset', label: '비밀번호 초기화' },
];

export default function MembersClient({
  tab,
  basePath,
  members,
  villages,
  resetRequests,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="border-b border-stone-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Tabs">
          {TABS.map((t) => {
            const href =
              t.key === 'all'
                ? `${basePath}/admin/members`
                : `${basePath}/admin/members?tab=${t.key}`;
            const isActive = tab === t.key;
            return (
              <Link
                key={t.key}
                href={href}
                prefetch
                className={cn(
                  'whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {tab === 'reset' ? (
        <ResetRequestList initialRequests={resetRequests} />
      ) : (
        <MemberList
          showPending={tab === 'pending'}
          showGraduated={tab === 'graduated'}
          initialMembers={members}
          initialVillages={villages}
        />
      )}
    </div>
  );
}
