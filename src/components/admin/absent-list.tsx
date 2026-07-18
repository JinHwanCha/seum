'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PillTabs } from '@/components/ui/pill-tabs';
import { ROLE_LABELS_DEFAULT } from '@/lib/constants';
import { User, Calendar, Phone, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';

export interface AbsentMember {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  birth_date: string | null;
  village_name: string | null;
  cell_name: string | null;
  last_attended: string | null;
  absent_weeks: number | null;
}

interface AbsentListProps {
  worship: AbsentMember[];
  department: AbsentMember[];
  smallGroup: AbsentMember[];
  totalMembers: number;
}

type TabKey = 'worship' | 'department' | 'smallGroup';

const TAB_META: Record<TabKey, { label: string; empty: string }> = {
  worship: { label: '예배', empty: '3주 연속 예배 결석자가 없습니다.' },
  department: { label: '부서집회', empty: '3주 연속 부서집회 미참여자가 없습니다.' },
  smallGroup: { label: '소그룹', empty: '3주 연속 소그룹 미참여자가 없습니다.' },
};

export function AbsentList({
  worship,
  department,
  smallGroup,
  totalMembers,
}: AbsentListProps) {
  const [tab, setTab] = useState<TabKey>('worship');

  const lists: Record<TabKey, AbsentMember[]> = {
    worship,
    department,
    smallGroup,
  };
  const members = lists[tab];

  return (
    <div className="space-y-3">
      <PillTabs
        tabs={[
          { key: 'worship', label: `예배 ${worship.length}` },
          { key: 'department', label: `부서집회 ${department.length}` },
          { key: 'smallGroup', label: `소그룹 ${smallGroup.length}` },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="warning">3주 연속 결석 기준</Badge>
        <Badge variant="danger">{members.length}명</Badge>
        <Badge variant="default">전체 {totalMembers}명 중</Badge>
      </div>

      {members.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-stone-400">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{TAB_META[tab].empty}</p>
            <p className="mt-1 text-xs">3주 이상 연속 결석한 인원이 없습니다.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id} className="!p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <User size={14} className="flex-shrink-0 text-stone-400" />
                    <span className="truncate text-sm font-medium text-stone-900">
                      {m.name}
                      {m.birth_date && (
                        <span className="font-normal text-stone-400"> ({m.birth_date.substring(2, 4)})</span>
                      )}
                    </span>
                    <Badge variant="default">{ROLE_LABELS_DEFAULT[m.role] || m.role}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                    {m.village_name && <span>{m.village_name}</span>}
                    {m.cell_name && <span>{m.cell_name}</span>}
                    {m.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} />
                        {m.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <Badge variant="danger">
                    {m.absent_weeks === null ? '출석 기록 없음' : `${m.absent_weeks}주 연속 결석`}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] text-stone-400">
                    <Calendar size={10} />
                    {m.last_attended ? `마지막: ${formatDate(m.last_attended)}` : '기록 없음'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
