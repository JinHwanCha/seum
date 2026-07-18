import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { BibleApp } from '@/components/bible/bible-app';

export default async function BiblePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="pb-24 md:pb-6">
      <BibleApp />
    </div>
  );
}
