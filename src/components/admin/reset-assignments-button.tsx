'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function ResetAssignmentsButton() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 사역자/시스템관리자만 노출
  const canReset = user?.role === 'minister' || !!user?.isAdmin;
  if (!canReset) return null;

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reset-assignments', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '초기화에 실패했습니다.');
        return;
      }
      setOpen(false);
      router.refresh();
      alert('전체 회원의 마을/소그룹 배정과 목자·마을장 임명이 초기화되었습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RotateCcw size={14} className="mr-1" /> 배정 초기화
      </Button>

      <Modal isOpen={open} onClose={() => !loading && setOpen(false)} title="전체 배정 초기화">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">이 작업은 되돌릴 수 없습니다.</p>
              <ul className="list-disc space-y-0.5 pl-4 text-red-600">
                <li>전체 회원의 마을·소그룹 배정이 해제됩니다.</li>
                <li>목자·마을장 임명이 모두 초기화되어 목원이 됩니다.</li>
                <li>사역자는 변경되지 않습니다.</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button variant="danger" size="sm" onClick={handleReset} disabled={loading}>
              {loading ? '초기화 중...' : '초기화'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
