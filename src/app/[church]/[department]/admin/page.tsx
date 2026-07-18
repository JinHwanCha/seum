import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canAccessAdmin, canAccessAdvancedAdmin, canManageOrganization } from '@/lib/permissions';
import { Card } from '@/components/ui/card';
import { Users, Map, Tag, Settings, UserCheck, AlertTriangle, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import type { Role } from '@/lib/types';

const BASIC_ITEMS = [
  { href: '/admin/members?tab=pending', label: '가입 승인', desc: '대기 중인 회원 승인/거절', icon: UserCheck, color: 'bg-green-50 text-green-600' },
  { href: '/admin/members', label: '회원 관리', desc: '역할 및 소속 편성', icon: Users, color: 'bg-blue-50 text-blue-600' },
  { href: '/admin/attendance', label: '출석현황', desc: '주차별 예배·부서집회·소그룹 출석 통계', icon: BarChart3, color: 'bg-indigo-50 text-indigo-600' },
  { href: '/admin/absent', label: '장기미출석', desc: '3주 연속 결석한 멤버 (예배·부서집회·소그룹)', icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
];

const ORGANIZATION_ITEM = { href: '/admin/organization', label: '조직 관리', desc: '마을/소그룹 생성 및 관리', icon: Map, color: 'bg-purple-50 text-purple-600' };

const ADVANCED_ITEMS = [
  { href: '/admin/categories', label: '카테고리 관리', desc: '게시판 카테고리 추가/수정', icon: Tag, color: 'bg-amber-50 text-amber-600' },
  { href: '/admin/settings', label: '설정', desc: '교회/부서 정보 및 명칭 설정', icon: Settings, color: 'bg-stone-100 text-stone-600' },
];

interface PageProps {
  params: { church: string; department: string };
}

export default async function AdminPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const isBureau = session.isBureauLeader || session.isBureauMember;
  if (!canAccessAdmin(session.role as Role, isBureau, session.isAdmin)) {
    return (
      <div className="text-center py-12 text-stone-400 text-sm">
        접근 권한이 없습니다.
      </div>
    );
  }

  const showAdvanced = canAccessAdvancedAdmin(session.role as Role, isBureau, session.isAdmin);
  const showOrganization = canManageOrganization(session.role as Role, session.isAdmin);
  const items = [
    ...BASIC_ITEMS,
    ...(showOrganization ? [ORGANIZATION_ITEM] : []),
    ...(showAdvanced ? ADVANCED_ITEMS : []),
  ];

  const basePath = `/${params.church}/${params.department}`;

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-bold text-stone-900">관리</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={`${basePath}${item.href}`} className="h-full">
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-stone-900 text-sm">{item.label}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
