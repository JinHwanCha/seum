'use client';

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { SessionPayload } from '@/lib/types';

interface AuthContextType {
  user: SessionPayload | null;
  loading: boolean;
  login: (
    churchName: string,
    name: string,
    password: string,
    selectedUserId?: string,
    rememberMe?: boolean
  ) => Promise<{ error?: string; multipleMatches?: boolean; users?: { id: string; phone: string }[] }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: SessionPayload | null;
}) {
  const router = useRouter();
  // 서버에서 내려온 세션을 초기값으로 사용 — API 호출 없음
  const [user, setUser] = useState<SessionPayload | null>(initialUser ?? null);

  // router.refresh() 후 서버 컴포넌트가 재렌더링되면 initialUser가 갱신됨
  useEffect(() => {
    setUser(initialUser ?? null);
  }, [initialUser]);

  const login = useCallback(
    async (
      churchName: string,
      name: string,
      password: string,
      selectedUserId?: string,
      rememberMe?: boolean
    ) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ churchName, name, password, selectedUserId, rememberMe }),
      });
      const resData = await res.json();
      if (res.ok && !resData.multipleMatches) {
        // 하드 네비게이션: 쿠키가 확실히 포함된 새 요청으로 Server Component를 렌더링
        window.location.href = `/${resData.churchSlug}/${resData.departmentSlug}`;
      }
      return resData;
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }, [router]);

  // Server Component를 소프트 리프레시해서 세션 최신화 (프로필 업데이트 후 등)
  const refreshUser = useCallback(async () => {
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
