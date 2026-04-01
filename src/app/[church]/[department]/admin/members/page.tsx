'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { MemberList } from '@/components/admin/member-list';

export default function MembersPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'pending' ? 'pending' : 'all';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = [
    { key: 'pending', label: '승인 대기' },
    { key: 'all', label: '전체 회원' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">회원 관리</h1>
      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      <MemberList showPending={activeTab === 'pending'} />
    </div>
  );
}
