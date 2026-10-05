'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { validateGroupSelection } from '@/lib/group-selection';
import type { VillageWithCells } from '@/lib/admin-data';
import type { SessionPayload } from '@/lib/types';

interface Props {
  user: SessionPayload;
  villages: VillageWithCells[];
  loadError: string;
}

export function GroupSelectionForm({ user, villages, loadError }: Props) {
  const { logout } = useAuth();
  const initialVillage = villages.find((village) => village.id === user.villageId);
  const [villageId, setVillageId] = useState(initialVillage?.id || '');
  const [cellId, setCellId] = useState(
    initialVillage?.cells.some((cell) => cell.id === user.cellId) ? user.cellId || '' : ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const cells = villages.find((village) => village.id === villageId)?.cells || [];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateGroupSelection(villages, villageId, cellId);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ villageId, cellId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || '저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      window.location.href = `/${user.churchSlug}/${user.departmentSlug}`;
    } catch {
      setError('저장에 실패했습니다. 연결을 확인하고 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardTitle className="mb-3">마을 · 소그룹 선택</CardTitle>
      <p className="text-sm text-stone-600 mb-4">
        {user.name}님, 환영합니다. 서비스 이용을 위해 자신의 마을과 소그룹을 선택해주세요.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Select
          label="마을"
          value={villageId}
          placeholder="마을을 선택해주세요."
          options={villages.map((village) => ({ value: village.id, label: village.name }))}
          disabled={saving || !!loadError}
          required
          onChange={(event) => {
            setVillageId(event.target.value);
            setCellId('');
            setError('');
          }}
        />
        <Select
          label="소그룹"
          value={cellId}
          placeholder="소그룹을 선택해주세요."
          options={cells.map((cell) => ({
            value: cell.id,
            label: cell.leader_name
              ? `${cell.name || '소그룹'} (${cell.leader_name})`
              : cell.name || '소그룹',
          }))}
          disabled={!villageId || saving || !!loadError}
          required
          onChange={(event) => {
            setCellId(event.target.value);
            setError('');
          }}
        />
        {!loadError && (villages.length === 0 || (villageId && cells.length === 0)) && (
          <p className="text-sm text-amber-700" role="alert">
            선택 가능한 마을 또는 소그룹이 없습니다. 마을장이나 사역자에게 문의해주세요.
          </p>
        )}
        <p className="text-sm text-stone-500">
          마을과 소그룹을 모두 선택해야 다음으로 넘어갈 수 있습니다.
          잘못 선택했거나 자신의 소속을 찾을 수 없다면 마을장이나 사역자에게 문의해주세요.
        </p>
        {(loadError || error) && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {loadError || error}
          </p>
        )}
        {loadError ? (
          <Button type="button" className="w-full" onClick={() => window.location.reload()}>
            다시 불러오기
          </Button>
        ) : (
          <Button type="submit" className="w-full" loading={saving}>
            선택 완료
          </Button>
        )}
        <Button type="button" variant="ghost" className="w-full" disabled={saving} onClick={logout}>
          로그아웃
        </Button>
      </form>
    </Card>
  );
}
