'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, KeyRound } from 'lucide-react';

interface ResetRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  user: { id: string; name: string; phone: string | null };
}

export function ResetRequestList() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reset-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !confirm('초기화 요청을 거절하시겠습니까?')) return;

    await fetch('/api/admin/reset-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });
    fetchRequests();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-stone-400 text-sm">불러오는 중...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-stone-400 text-sm">
        대기 중인 초기화 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-500 px-1">
        승인 시 해당 회원의 비밀번호가 <span className="font-semibold">0000</span>으로 초기화됩니다. (사역자 이상 처리 가능)
      </p>
      {requests.map((req) => (
        <div
          key={req.id}
          className="warm-surface rounded-xl border border-stone-200/80 p-4 flex items-center justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-amber-500" />
              <span className="font-medium text-stone-900">{req.user?.name}</span>
              <Badge variant="warning">초기화 요청</Badge>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {req.user?.phone} · 요청일: {formatDate(req.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button size="sm" onClick={() => handleAction(req.id, 'approve')}>
              <Check size={14} className="mr-1" /> 승인
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleAction(req.id, 'reject')}>
              <X size={14} className="mr-1" /> 거절
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
