'use client';

import { VillageManager } from '@/components/admin/village-manager';

export default function OrganizationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-stone-900">조직 관리</h1>
      <p className="text-sm text-stone-500">마을과 소그룹을 생성, 수정, 삭제할 수 있습니다.</p>
      <VillageManager />
    </div>
  );
}
