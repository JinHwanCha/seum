'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS_DEFAULT, MINISTER_RANK_LABELS } from '@/lib/constants';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { SessionPayload } from '@/lib/types';

interface ProfileData {
  birth_date: string | null;
  phone: string | null;
  village_name: string | null;
  cell_name: string | null;
}

interface Props {
  user: SessionPayload;
  basePath: string;
  profile: ProfileData;
  deletionRequested: boolean;
}

export default function ProfileClient({ user, basePath, profile, deletionRequested }: Props) {
  const [form, setForm] = useState({
    birthDate: profile.birth_date || '',
    phone: profile.phone || '',
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(deletionRequested);

  const villageName = profile.village_name;
  const cellName = profile.cell_name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (form.newPassword && form.newPassword !== form.newPasswordConfirm) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: form.birthDate,
          phone: form.phone,
          ...(form.newPassword
            ? { currentPassword: form.currentPassword, newPassword: form.newPassword }
            : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '저장에 실패했습니다.');
        return;
      }

      setMessage('저장되었습니다.');
      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: '',
      }));
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = user.ministerRank
    ? MINISTER_RANK_LABELS[user.ministerRank]
    : ROLE_LABELS_DEFAULT[user.role];

  const requestDeletion = async () => {
    if (!deletePassword || !confirm('계정 삭제 요청을 접수하시겠습니까?')) return;
    setError('');
    setRequestingDeletion(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '탈퇴 요청을 접수하지 못했습니다.');
        return;
      }
      setDeleteRequested(true);
      setDeletePassword('');
    } catch {
      setError('탈퇴 요청을 접수하지 못했습니다.');
    } finally {
      setRequestingDeletion(false);
    }
  };

  return (
    <div className="space-y-2 max-w-lg">
      <div className="flex items-center gap-2">
        <Link
          href={basePath}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold text-stone-900">내 정보</h1>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-stone-900">{user.name}</div>
            <Badge variant="primary">{roleLabel}</Badge>
          </div>
        </div>
        {(villageName || cellName) && (
          <div className="border-t border-stone-100 pt-3 space-y-1">
            {villageName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-stone-500">마을</span>
                <span className="font-medium text-stone-900">{villageName}</span>
              </div>
            )}
            {cellName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-stone-500">소그룹</span>
                <span className="font-medium text-stone-900">{cellName}</span>
              </div>
            )}
          </div>
        )}
        {!villageName && !cellName && (
          <div className="border-t border-stone-100 pt-3">
            <p className="text-xs text-stone-400">마을/소그룹이 아직 배정되지 않았습니다.</p>
          </div>
        )}
      </Card>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Card>
          <CardTitle className="text-base mb-4">기본 정보</CardTitle>
          <div className="space-y-3">
            <Input
              label="생년월일"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
            />
            <Input
              label="전화번호"
              type="tel"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
        </Card>

        <Card>
          <CardTitle className="text-base mb-4">비밀번호 변경</CardTitle>
          <div className="space-y-3">
            <Input
              label="현재 비밀번호"
              type="password"
              value={form.currentPassword}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
            />
            <Input
              label="새 비밀번호"
              type="password"
              placeholder="4자 이상"
              value={form.newPassword}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
            />
            <Input
              label="새 비밀번호 확인"
              type="password"
              value={form.newPasswordConfirm}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, newPasswordConfirm: e.target.value }))
              }
            />
          </div>
        </Card>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
        )}
        {message && (
          <div className="bg-green-50 text-green-600 text-sm rounded-lg p-3">{message}</div>
        )}

        <Button type="submit" className="w-full" loading={saving}>
          저장
        </Button>
      </form>

      <Card>
        <CardTitle className="text-base mb-2">계정 삭제</CardTitle>
        {deleteRequested ? (
          <p className="text-sm leading-relaxed text-stone-600">
            계정 삭제 요청이 접수되었습니다. 소속 교회 관리자가 확인한 뒤 30일 이내 처리합니다.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-stone-500">
              요청 후 30일 이내 계정과 개인정보가 삭제됩니다. 법령상 보관 의무가 있거나 공동체 기록의
              무결성을 위해 필요한 게시물은 작성자 정보가 제거된 상태로 보관될 수 있습니다.
            </p>
            <Input
              label="현재 비밀번호"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <Button
              type="button"
              variant="danger"
              className="w-full"
              loading={requestingDeletion}
              disabled={!deletePassword}
              onClick={requestDeletion}
            >
              <Trash2 size={16} className="mr-1.5" /> 계정 삭제 요청
            </Button>
          </div>
        )}
      </Card>

      <div className="flex justify-center gap-4 pb-4 text-xs text-stone-400">
        <Link href="/privacy" className="hover:text-primary-600">개인정보 처리방침</Link>
        <Link href="/terms" className="hover:text-primary-600">이용약관</Link>
      </div>
    </div>
  );
}
