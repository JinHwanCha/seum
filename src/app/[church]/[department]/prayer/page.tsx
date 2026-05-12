import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSmallGroupData } from '@/lib/small-group-data';
import { getCurrentWeekSunday, formatWeekDate } from '@/lib/date-utils';
import SmallGroupClient from './small-group-client';
export default async function SmallGroupPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const weekStart = formatWeekDate(getCurrentWeekSunday());
  const initialData = await getSmallGroupData(session, weekStart);
  return <SmallGroupClient initialData={initialData} />;
}