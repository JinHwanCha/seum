'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    churchName: '',
    pastorName: '',
    name: '',
    birthDate: '',
    phone: '',
    departmentId: '',
    password: '',
    passwordConfirm: '',
  });
  const [departments, setDepartments] = useState<{ value: string; label: string }[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [churchValid, setChurchValid] = useState<boolean | null>(null);

  // Validate church when name + pastor entered
  useEffect(() => {
    const cleanChurch = form.churchName.trim().replace(/^['‘’“”"]+|['‘’“”"]+$/g, '');
    const cleanPastor = form.pastorName.trim().replace(/^['‘’“”"]+|['‘’“”"]+$/g, '');
    if (cleanChurch.length >= 2 && cleanPastor.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/auth/register?action=validateChurch&churchName=${encodeURIComponent(cleanChurch)}&pastorName=${encodeURIComponent(cleanPastor)}`
          );
          const data = await res.json();
          setChurchValid(data.valid);
          if (data.departments) {
            setDepartments(
              data.departments.map((d: any) => ({ value: d.id, label: d.name }))
            );
          }
        } catch {
          setChurchValid(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setChurchValid(null);
      setDepartments([]);
    }
  }, [form.churchName, form.pastorName]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (form.password.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    if (!churchValid) {
      setError('교회 정보가 올바르지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          churchName: form.churchName.trim().replace(/^['‘’“”"]+|['‘’“”"]+$/g, ''),
          pastorName: form.pastorName.trim().replace(/^['‘’“”"]+|['‘’“”"]+$/g, ''),
          name: form.name,
          birthDate: form.birthDate || null,
          phone: form.phone,
          departmentId: form.departmentId,
          password: form.password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '회원가입에 실패했습니다.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto text-center">
        <div className="bg-green-50 rounded-xl p-8">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-lg font-semibold text-green-800 mb-2">가입 신청 완료</h2>
          <p className="text-sm text-green-600 mb-6">
            사역자 승인 후 이용 가능합니다.
          </p>
          <Button variant="outline" onClick={() => router.push('/login')}>
            로그인 페이지로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600 mb-2">세움</h1>
        <p className="text-gray-500 text-sm">회원가입</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="교회 이름"
          placeholder="예: 내수동교회"
          value={form.churchName}
          onChange={(e) => updateField('churchName', e.target.value)}
          required
        />
        <Input
          label="담임 목사"
          placeholder="담임 목사 이름"
          value={form.pastorName}
          onChange={(e) => updateField('pastorName', e.target.value)}
          required
        />

        {churchValid === false && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
            교회 이름 또는 담임목사 이름이 일치하지 않습니다.
          </div>
        )}
        {churchValid === true && (
          <div className="bg-green-50 text-green-600 text-sm rounded-lg p-3">
            ✓ 교회 확인 완료
          </div>
        )}

        {departments.length > 0 && (
          <Select
            label="부서"
            options={departments}
            placeholder="부서를 선택하세요"
            value={form.departmentId}
            onChange={(e) => updateField('departmentId', e.target.value)}
            required
          />
        )}

        <Input
          label="이름"
          placeholder="실명을 입력하세요"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
        />
        <Input
          label="생년월일"
          type="date"
          value={form.birthDate}
          onChange={(e) => updateField('birthDate', e.target.value)}
        />
        <Input
          label="전화번호"
          type="tel"
          placeholder="010-0000-0000"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          required
        />
        <Input
          label="비밀번호"
          type="password"
          placeholder="4자 이상"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          required
        />
        <Input
          label="비밀번호 확인"
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          value={form.passwordConfirm}
          onChange={(e) => updateField('passwordConfirm', e.target.value)}
          required
        />

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
          disabled={!churchValid}
        >
          회원가입
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        이미 계정이 있으신가요?{' '}
        <a href="/login" className="text-primary-600 font-medium hover:underline">
          로그인
        </a>
      </p>
    </div>
  );
}
