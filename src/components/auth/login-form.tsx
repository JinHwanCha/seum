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
  const [multipleUsers, setMultipleUsers] = useState<{ id: string; phone: string }[] | null>(null);

  const handleSubmit = async (e: React.FormEvent, selectedUserId?: string) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(churchName, name, password, selectedUserId);
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

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600 mb-2">세움</h1>
        <p className="text-gray-500 text-sm">교회 공동체 나눔 플랫폼</p>
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

      <p className="text-center text-sm text-gray-500 mt-6">
        계정이 없으신가요?{' '}
        <a href="/register" className="text-primary-600 font-medium hover:underline">
          회원가입
        </a>
      </p>
    </div>
  );
}
