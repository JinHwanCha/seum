import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getVillagesWithCells, type VillageWithCells } from '@/lib/admin-data';
import { GroupSelectionForm } from '@/components/auth/group-selection-form';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!session.requiresGroupSelection) {
    redirect(`/${session.churchSlug}/${session.departmentSlug}`);
  }

  let villages: VillageWithCells[] = [];
  let error = '';
  try {
    villages = await getVillagesWithCells(session);
  } catch (cause) {
    console.error('Onboarding organization lookup failed:', cause);
    error = '마을과 소그룹을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12 bg-page">
      <GroupSelectionForm
        user={session}
        villages={villages}
        loadError={error}
      />
    </div>
  );
}
