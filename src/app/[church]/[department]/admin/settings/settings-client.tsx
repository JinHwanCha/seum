'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS_DEFAULT } from '@/lib/constants';
import type { SessionPayload } from '@/lib/types';

interface Settings {
  church_name?: string;
  pastor_name?: string;
  department_name?: string;
}

interface Props {
  user: SessionPayload;
  settings: Settings;
  initialRoleLabels: Record<string, string>;
}

export default function SettingsClient({ user, settings, initialRoleLabels }: Props) {
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>(initialRoleLabels);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveLabels = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleLabels }),
      });
      if (res.ok) setMessage('저장되었습니다.');
    } catch {
      setMessage('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const isPastor = user.ministerRank === 'pastor';

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-lg font-bold text-stone-900">설정</h1>

      <Card>
        <CardTitle>교회 정보</CardTitle>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">교회 이름</span>
            <span className="font-medium">{settings.church_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">담임 목사</span>
            <span className="font-medium">{settings.pastor_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">부서</span>
            <span className="font-medium">{settings.department_name}</span>
          </div>
        </div>
      </Card>

      {isPastor && (
        <Card>
          <CardTitle>직급 명칭 설정</CardTitle>
          <p className="text-xs text-stone-500 mb-4">목사님만 수정 가능합니다.</p>
          <div className="space-y-3">
            {Object.entries(ROLE_LABELS_DEFAULT).map(([key, defaultLabel]) => {
              if (key === 'pending') return null;
              return (
                <Input
                  key={key}
                  label={`${defaultLabel} 명칭`}
                  value={roleLabels[key] || defaultLabel}
                  onChange={(e) =>
                    setRoleLabels((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              );
            })}
          </div>
          {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveLabels} loading={saving}>
              저장
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
