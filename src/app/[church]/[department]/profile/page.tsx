import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import ProfileClient from './profile-client';

interface PageProps {
  params: { church: string; department: string };
}

export default async function ProfilePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const supabase = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('birth_date, phone, village_id, cell_id')
    .eq('id', session.userId)
    .single();

  // village/cell 이름 병렬 조회
  const [villageResult, cellResult] = await Promise.all([
    user?.village_id
      ? supabase.from('villages').select('name').eq('id', user.village_id).single()
      : Promise.resolve({ data: null as { name: string } | null }),
    user?.cell_id
      ? supabase.from('cells').select('name').eq('id', user.cell_id).single()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  const profile = {
    birth_date: user?.birth_date ?? null,
    phone: user?.phone ?? null,
    village_name: villageResult.data?.name ?? null,
    cell_name: cellResult.data?.name ?? null,
  };

  const basePath = `/${params.church}/${params.department}`;

  return <ProfileClient user={session} basePath={basePath} profile={profile} />;
}
