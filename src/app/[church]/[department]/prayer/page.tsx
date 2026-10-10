import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSmallGroupData } from '@/lib/small-group-data';
import { getCurrentWeekSunday, formatWeekDate } from '@/lib/date-utils';
import SmallGroupClient from './small-group-client';
import { PagePending } from '@/components/ui/page-pending';

// 데이터 fetch는 Suspense 내부에서 — 셸 즉시 렌더, 데이터는 스트리밍
async function SmallGroupWithData() {
  const session = await getSession();
  if (!session) redirect('/login');
  const weekStart = formatWeekDate(getCurrentWeekSunday());
  const initialData = await getSmallGroupData(session, weekStart);
  return <SmallGroupClient initialData={initialData} />;
}

export default function SmallGroupPage() {
  return (
    <Suspense fallback={<PagePending />}>
      <SmallGroupWithData />
    </Suspense>
  );
}
