import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import SmallGroupClient from './small-group-client';

export default async function SmallGroupPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <SmallGroupClient />;
}
