'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';

const MemberList = dynamic(
  () => import('@/components/admin/member-list').then((m) => m.MemberList),
  { loading: () => <div className="animate-pulse h-48 bg-stone-100 rounded-xl" /> }
);
const ResetRequestList = dynamic(
  () => import('@/components/admin/reset-request-list').then((m) => m.ResetRequestList),
  { loading: () => <div className="animate-pulse h-32 bg-stone-100 rounded-xl" /> }
);

export default function MembersPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'pending' ? 'pending'
    : tabParam === 'reset' ? 'reset'
    : tabParam === 'graduated' ? 'graduated' : 'all';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = [
    { key: 'pending', label: '승인 대기' },
    { key: 'all', label: '전체 회원' },
    { key: 'graduated', label: '졸업' },
    { key: 'reset', label: '비밀번호 초기화' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-900">회원 관리</h1>
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'reset' ? (
        <ResetRequestList />
      ) : (
        <MemberList
          showPending={activeTab === 'pending'}
          showGraduated={activeTab === 'graduated'}
        />
      )}
    </div>
  );
}
