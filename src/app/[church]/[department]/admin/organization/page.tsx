'use client';

import dynamic from 'next/dynamic';
import { AdminBackButton } from '@/components/admin/back-button';

const VillageManager = dynamic(
  () => import('@/components/admin/village-manager').then((m) => m.VillageManager),
  { loading: () => <div className="animate-pulse h-32 bg-stone-100 rounded-xl" /> }
);

export default function OrganizationPage() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <AdminBackButton />
        <h1 className="text-lg font-bold text-stone-900">조직 관리</h1>
      </div>
      <p className="text-sm text-stone-500">마을과 소그룹을 생성, 수정, 삭제할 수 있습니다.</p>
      <VillageManager />
    </div>
  );
}
