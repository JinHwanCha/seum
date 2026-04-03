'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS_DEFAULT, MINISTER_RANK_LABELS } from '@/lib/constants';
import { UsersRound, Megaphone, MessageSquare, Users, Heart } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const QUICK_LINKS = [
  { href: '/prayer', label: '소그룹', icon: UsersRound, color: 'bg-primary-50 text-primary-600' },
  { href: '/boards/notice', label: '공지', icon: Megaphone, color: 'bg-accent-50 text-accent-600' },
  { href: '/boards/sharing', label: '나눔', icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
  { href: '/boards/gathering', label: '모임', icon: Users, color: 'bg-sky-50 text-sky-600' },
  { href: '/boards/intercession', label: '중보기도', icon: Heart, color: 'bg-rose-50 text-rose-600' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const params = useParams();
  const basePath = `/${params.church}/${params.department}`;

  if (!user) return null;

  const roleLabel = user.ministerRank
    ? MINISTER_RANK_LABELS[user.ministerRank]
    : ROLE_LABELS_DEFAULT[user.role];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="bg-gradient-to-br from-primary-500 to-primary-700 border-0 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold mb-1">
              안녕하세요, {user.name}님 👋
            </h1>
            <p className="text-primary-100 text-sm">오늘도 은혜로운 하루 되세요.</p>
          </div>
          <Badge className="bg-white/20 text-white border-0">{roleLabel}</Badge>
        </div>
      </Card>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 mb-3 px-1">바로가기</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={`${basePath}${link.href}`}>
                <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center mx-auto mb-2`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-sm font-medium text-stone-700">{link.label}</span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
