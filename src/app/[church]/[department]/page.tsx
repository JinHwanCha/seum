import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS_DEFAULT, MINISTER_RANK_LABELS } from '@/lib/constants';
import { UsersRound, BookOpen, MessageSquare, Users, Heart, Shield } from 'lucide-react';
import Link from 'next/link';
import { GatheringBoard } from '@/components/gathering/gathering-board';
import { WorshipGuide } from '@/components/worship/worship-guide';
import { DashboardFallback } from '@/components/dashboard-fallback';
import { loadGatherings, loadWorshipItems } from '@/lib/dashboard-data';


function getQuickLinks(session: any) {
  const links = [
    { href: '/bible', label: '성경', icon: BookOpen, color: 'bg-accent-50 text-accent-600' },
    { href: '/prayer', label: '소그룹', icon: UsersRound, color: 'bg-primary-50 text-primary-600' },
    { href: '/boards/sharing', label: '나눔', icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
    { href: '/boards/gathering', label: '모임', icon: Users, color: 'bg-sky-50 text-sky-600' },
    { href: '/boards/intercession', label: '기도제목', icon: Heart, color: 'bg-rose-50 text-rose-600' },
  ];
  const isBureau = session.isBureauLeader || session.isBureauMember;
  const isAdmin = session.isAdmin;
  const isVillageLeaderOrAbove = session.role === 'minister' || session.role === 'village_leader' || isBureau || isAdmin;
  if (isVillageLeaderOrAbove) {
    links.push({
      href: '/admin',
      label: '관리',
      icon: Shield,
      color: 'bg-amber-50 text-amber-600',
    });
  }
  return links;
}

interface PageProps {
  params: { church: string; department: string };
}

export default async function DashboardPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const basePath = `/${params.church}/${params.department}`;
  const roleLabel = session.ministerRank
    ? MINISTER_RANK_LABELS[session.ministerRank]
    : ROLE_LABELS_DEFAULT[session.role];

  // 예배 안내/모임 데이터를 서버에서 미리 조회해 SWR fallback 으로 주입한다.
  // 클라이언트 페칭 워터폴(마운트→요청→스켈레톤→표시)을 제거해 즉시 렌더한다.
  const [worship, gatherings] = await Promise.all([
    loadWorshipItems(session).catch(() => null),
    loadGatherings(session).catch(() => null),
  ]);
  const fallback: Record<string, unknown> = {};
  if (worship) fallback['/api/worship-guide'] = worship;
  if (gatherings) fallback['/api/gatherings'] = gatherings;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="bg-gradient-to-br from-primary-500 to-primary-700 border-0 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold mb-1">
              안녕하세요, {session.name}님 👋
            </h1>
            <p className="text-primary-100 text-sm">오늘도 은혜로운 하루 되세요.</p>
          </div>
          <Badge className="bg-white/20 text-white border-0">{roleLabel}</Badge>
        </div>
      </Card>

      <DashboardFallback fallback={fallback}>
        {/* Worship Guide */}
        <WorshipGuide />

        {/* Gathering Board */}
        <GatheringBoard />
      </DashboardFallback>
    </div>
  );
}
