'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    churchName: '',
    pastorName: '',
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
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
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
    if (!privacyAgreed) {
      setError('개인정보 수집 및 이용에 동의해주세요.');
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
          birthDate: form.birthYear && form.birthMonth && form.birthDay
            ? `${form.birthYear}-${form.birthMonth.padStart(2, '0')}-${form.birthDay.padStart(2, '0')}`
            : null,
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
        <h1 className="text-3xl font-bold text-primary-700 mb-2">세움</h1>
        <p className="text-stone-500 text-sm">회원가입</p>
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
        <div className="space-y-1">
          <label className="block text-sm font-medium text-stone-700">생년월일</label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={form.birthYear}
              onChange={(e) => updateField('birthYear', e.target.value)}
              className="block w-full rounded-lg border border-stone-300 px-2 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">년도</option>
              {Array.from({ length: 50 }, (_, i) => {
                const y = new Date().getFullYear() - 19 - i;
                return <option key={y} value={String(y)}>{y}년</option>;
              })}
            </select>
            <select
              value={form.birthMonth}
              onChange={(e) => updateField('birthMonth', e.target.value)}
              className="block w-full rounded-lg border border-stone-300 px-2 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">월</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}월</option>
              ))}
            </select>
            <select
              value={form.birthDay}
              onChange={(e) => updateField('birthDay', e.target.value)}
              className="block w-full rounded-lg border border-stone-300 px-2 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">일</option>
              {Array.from({ length: (() => {
                const y = parseInt(form.birthYear) || 2000;
                const m = parseInt(form.birthMonth) || 1;
                return new Date(y, m, 0).getDate();
              })() }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}일</option>
              ))}
            </select>
          </div>
        </div>
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

        {/* Privacy Consent */}
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="w-full flex items-center justify-between p-3 bg-primary-50/40 hover:bg-primary-50/70 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary-600" />
              <span className="text-sm font-medium text-stone-700">개인정보 수집 및 이용 동의</span>
            </div>
            {showPrivacy ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
          </button>
          {showPrivacy && (
            <div className="p-4 bg-white border-t border-stone-100 text-xs text-stone-600 space-y-3 max-h-64 overflow-y-auto">
              <p className="font-semibold text-stone-800 text-sm">개인정보 수집 및 이용 안내</p>
              <p className="leading-relaxed">
                세움은 교회 공동체 안에서 한 영혼을 온전히 세우고 양육하기 위한 목적으로
                아래의 개인정보를 수집합니다.
              </p>
              <div>
                <p className="font-medium text-stone-700 mb-1">1. 수집 항목</p>
                <p>이름, 생년월일, 전화번호, 소속 교회 및 부서 정보</p>
              </div>
              <div>
                <p className="font-medium text-stone-700 mb-1">2. 수집 목적</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>소그룹 편성 및 양육 관리</li>
                  <li>기도제목 나눔과 중보기도</li>
                  <li>교회 내 소통 및 공동체 활동 지원</li>
                  <li>사역자의 심방 및 돌봄</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-stone-700 mb-1">3. 보유 기간</p>
                <p>회원 탈퇴 시 또는 부서 졸업 후 1년까지 보관 후 파기합니다.</p>
              </div>
              <div>
                <p className="font-medium text-stone-700 mb-1">4. 안내 사항</p>
                <p>
                  수집된 정보는 교회 사역 외의 목적으로 사용되지 않으며,
                  외부에 제공하지 않습니다. 동의를 거부할 수 있으나,
                  이 경우 서비스 이용이 제한될 수 있습니다.
                </p>
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 p-3 border-t border-stone-100 cursor-pointer hover:bg-stone-50 transition-colors">
            <input
              type="checkbox"
              checked={privacyAgreed}
              onChange={(e) => setPrivacyAgreed(e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-stone-700">
              개인정보 수집 및 이용에 동의합니다 <span className="text-red-500">*</span>
            </span>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={loading}
          disabled={!churchValid || !privacyAgreed}
        >
          회원가입
        </Button>
      </form>

      <p className="text-center text-sm text-stone-500 mt-6">
        이미 계정이 있으신가요?{' '}
        <a href="/login" className="text-primary-600 font-medium hover:underline">
          로그인
        </a>
      </p>
    </div>
  );
}
