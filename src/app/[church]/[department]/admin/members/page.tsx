'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { MemberList } from '@/components/admin/member-list';
import { ResetRequestList } from '@/components/admin/reset-request-list';

export default function MembersPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'pending' ? 'pending'
    : searchParams.get('tab') === 'reset' ? 'reset' : 'all';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = [
    { key: 'pending', label: '승인 대기' },
    { key: 'all', label: '전체 회원' },
    { key: 'reset', label: '비밀번호 초기화' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-900">회원 관리</h1>
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      {activeTab === 'reset' ? (
        <ResetRequestList />
      ) : (
        <MemberList showPending={activeTab === 'pending'} />
      )}
    </div>
  );
}
