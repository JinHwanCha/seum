import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';
import { createClient } from '@/lib/supabase';
import type { Role } from '@/lib/types';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!canAccessAdmin(session.role as Role, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return <div className="text-center py-12 text-stone-400 text-sm">접근 권한이 없습니다.</div>;
  }

  const supabase = createClient();

  // 모든 쿼리 병렬 실행
  const [{ data: church }, { data: department }, { data: roleLabelsRaw }] = await Promise.all([
    supabase.from('churches').select('name, pastor_name').eq('id', session.churchId).single(),
    supabase.from('departments').select('name').eq('id', session.departmentId).single(),
    supabase.from('role_labels').select('role_key, label').eq('department_id', session.departmentId),
  ]);

  const settings = {
    church_name: church?.name,
    pastor_name: church?.pastor_name,
    department_name: department?.name,
  };

  const initialRoleLabels: Record<string, string> = {};
  (roleLabelsRaw || []).forEach((rl: any) => {
    initialRoleLabels[rl.role_key] = rl.label;
  });

  return (
    <SettingsClient
      user={session}
      settings={settings}
      initialRoleLabels={initialRoleLabels}
    />
  );
}
