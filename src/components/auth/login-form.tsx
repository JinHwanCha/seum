'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const { login } = useAuth();
  const [churchName, setChurchName] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [multipleUsers, setMultipleUsers] = useState<{ id: string; phone: string }[] | null>(null);

  // 비밀번호 찾기
  const [showReset, setShowReset] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const handleSubmit = async (e: React.FormEvent, selectedUserId?: string) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(churchName, name, password, selectedUserId, rememberMe);
      if (result.error) {
        setError(result.error);
      }
      if (result.multipleMatches && result.users) {
        setMultipleUsers(result.users);
      }
    } catch {
      setError('로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    if (!churchName || !name) {
      setResetError('교회 이름과 이름을 먼저 입력해주세요.');
      return;
    }
    if (!resetPhone) {
      setResetError('가입 시 등록한 전화번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ churchName, name, phone: resetPhone }),
      });
      const data = await res.json();

      if (res.ok) {
        setResetMessage('비밀번호 초기화 요청이 접수되었습니다. 사역자 승인 후 비밀번호가 0000으로 초기화됩니다. 담당 사역자에게 문의해주시기 바랍니다.');
        setShowReset(false);
        setResetPhone('');
      } else {
        setResetError(data.error || '요청에 실패했습니다.');
      }
    } catch {
      setResetError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-700 mb-2">세움</h1>
        <p className="text-stone-500 text-sm">교회 공동체 나눔 플랫폼</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="교회 이름"
          placeholder="예: 내수동교회"
          value={churchName}
          onChange={(e) => setChurchName(e.target.value)}
          required
        />
        <Input
          label="이름"
          placeholder="이름을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="비밀번호"
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-stone-600">로그인 유지</span>
        </label>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
        )}

        {multipleUsers && (
          <div className="bg-amber-50 rounded-lg p-3 space-y-2">
            <p className="text-sm text-amber-800 font-medium">동명이인이 존재합니다. 본인의 계정을 선택하세요.</p>
            {multipleUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={(e) => {
                  setMultipleUsers(null);
                  handleSubmit(e as any, u.id);
                }}
                className="w-full text-left px-3 py-2 bg-white rounded-lg border border-amber-200 text-sm hover:bg-amber-50 transition-colors"
              >
                전화번호: {u.phone}
              </button>
            ))}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          로그인
        </Button>
      </form>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => {
            setShowReset(!showReset);
            setResetError('');
            setResetMessage('');
          }}
          className="text-sm text-stone-500 hover:text-primary-600 transition-colors"
        >
          비밀번호를 잊으셨나요?
        </button>
      </div>

      {showReset && (
        <form onSubmit={handleResetPassword} className="mt-4 p-4 bg-stone-50 rounded-xl space-y-3 border border-stone-200/80">
          <p className="text-sm font-medium text-stone-700">
            위에 교회 이름과 이름을 입력한 뒤, 가입 시 등록한 전화번호를 입력하세요.
          </p>
          <p className="text-xs text-stone-500">
            사역자 승인 후 비밀번호가 <span className="font-semibold">0000</span>으로 초기화됩니다. 요청 후 담당 사역자에게 문의해주세요.
          </p>
          <Input
            label="가입 전화번호"
            placeholder="010-0000-0000"
            value={resetPhone}
            onChange={(e) => setResetPhone(e.target.value)}
            required
          />
          {resetError && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{resetError}</div>
          )}
          <Button type="submit" className="w-full" loading={loading}>
            초기화 요청
          </Button>
        </form>
      )}

      {resetMessage && (
        <div className="bg-primary-50 text-primary-700 text-sm rounded-lg p-3 mt-4">{resetMessage}</div>
      )}

      <p className="text-center text-sm text-stone-500 mt-6">
        계정이 없으신가요?{' '}
        <a href="/register" className="text-primary-600 font-medium hover:underline">
          회원가입
        </a>
      </p>
    </div>
  );
}
