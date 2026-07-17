import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { WorshipGuide } from '@/components/worship/worship-guide';

export default async function NoticePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="space-y-6">
      <WorshipGuide />
    </div>
  );
}
