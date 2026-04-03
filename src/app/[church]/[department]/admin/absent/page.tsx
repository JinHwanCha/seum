'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { canAccessAdmin } from '@/lib/permissions';
import { ROLE_LABELS_DEFAULT } from '@/lib/constants';
import { AlertTriangle, User, Calendar, Phone } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import type { Role } from '@/lib/types';

interface AbsentMember {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  birth_date: string | null;
  village_name: string | null;
  cell_name: string | null;
  last_attended: string | null;
  absent_weeks: number;
}

export default function AbsentMembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<AbsentMember[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [periodWeeks, setPeriodWeeks] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/absent-members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data || []);
        setTotalMembers(data.totalMembers || 0);
        setPeriodWeeks(data.periodWeeks || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user || !canAccessAdmin(user.role as Role, user.isBureauLeader || user.isBureauMember, user.isAdmin)) {
    return (
      <div className="text-center py-12 text-stone-400 text-sm">
        접근 권한이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-500" />
          <h1 className="text-lg font-bold text-stone-900">장기미출석</h1>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="warning">
          최근 {periodWeeks}주 기준
        </Badge>
        <Badge variant="danger">
          {members.length}명 미출석
        </Badge>
        <Badge variant="default">
          전체 {totalMembers}명 중
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>
      ) : members.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-stone-400">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">장기미출석자가 없습니다.</p>
            <p className="text-xs mt-1">모든 멤버가 최근 {periodWeeks}주 내에 출석했습니다.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Card key={m.id} className="!p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <User size={14} className="text-stone-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-stone-900 truncate">
                      {m.name}
                      {m.birth_date && (
                        <span className="text-stone-400 font-normal"> ({m.birth_date.substring(2, 4)})</span>
                      )}
                    </span>
                    <Badge variant="default">
                      {ROLE_LABELS_DEFAULT[m.role] || m.role}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                    {m.village_name && (
                      <span>{m.village_name}</span>
                    )}
                    {m.cell_name && (
                      <span>{m.cell_name}</span>
                    )}
                    {m.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} />
                        {m.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant="danger">
                    {m.absent_weeks}주 미출석
                  </Badge>
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {m.last_attended
                      ? `마지막: ${formatDate(m.last_attended)}`
                      : '출석 기록 없음'}
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
