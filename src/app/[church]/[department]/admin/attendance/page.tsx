import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canAccessAdmin } from '@/lib/permissions';
import { BarChart3 } from 'lucide-react';
import type { Role } from '@/lib/types';
import { AdminBackButton } from '@/components/admin/back-button';
import { AttendanceStats } from '@/components/admin/attendance-stats';

export default async function AttendanceStatsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (!canAccessAdmin(session.role as Role, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return (
      <div className="text-center py-12 text-stone-400 text-sm">
        접근 권한이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <AdminBackButton />
        <BarChart3 size={20} className="text-primary-500" />
        <h1 className="text-lg font-bold text-stone-900">출석현황</h1>
      </div>
      <AttendanceStats />
    </div>
  );
}
