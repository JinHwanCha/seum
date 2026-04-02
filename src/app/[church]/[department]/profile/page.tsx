'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS_DEFAULT, MINISTER_RANK_LABELS } from '@/lib/constants';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const basePath = `/${params.church}/${params.department}`;

  const [form, setForm] = useState({
    birthDate: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/auth/profile');
        if (res.ok) {
          const data = await res.json();
          setForm((prev) => ({
            ...prev,
            birthDate: data.user.birth_date || '',
            phone: data.user.phone || '',
          }));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

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

  if (!user) return null;

  const roleLabel = user.ministerRank
    ? MINISTER_RANK_LABELS[user.ministerRank]
    : ROLE_LABELS_DEFAULT[user.role];

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <Link
          href={basePath}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">내 정보</h1>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{user.name}</div>
            <Badge variant="primary">{roleLabel}</Badge>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
      )}
    </div>
  );
}
