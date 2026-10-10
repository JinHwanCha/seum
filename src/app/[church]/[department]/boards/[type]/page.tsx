import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canWritePost } from '@/lib/permissions';
import { CachedBoard } from '@/components/board/cached-board';
import { Button } from '@/components/ui/button';
import { BOARD_TYPE_LABELS } from '@/lib/constants';
import { Plus } from 'lucide-react';
import { NavigationLink } from '@/components/layout/navigation-provider';
import type { BoardType } from '@/lib/types';

interface PageProps {
  params: { church: string; department: string; type: string };
}

export default async function BoardListPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');
  const canWrite = canWritePost(session.role, params.type as BoardType,
    session.isBureauLeader || session.isBureauMember);
  const basePath = `/${params.church}/${params.department}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-900">{BOARD_TYPE_LABELS[params.type] || params.type}</h1>
        {canWrite && <NavigationLink href={`${basePath}/boards/${params.type}/new`}>
          <Button size="sm"><Plus size={16} className="mr-1" />글쓰기</Button>
        </NavigationLink>}
      </div>
      <CachedBoard boardType={params.type} />
    </div>
  );
}
