'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const didInitRef = useRef(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 로그인/회원가입 페이지에서는 세션 체크 불필요 (401 콘솔 에러 방지)
    if (pathname === '/login' || pathname === '/register') {
      setLoading(false);
      return;
    }
    // StrictMode 중복 호출 방지
    if (didInitRef.current) return;
    didInitRef.current = true;
    refreshUser();
  }, [pathname, refreshUser]);

  const login = async (
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
    const data = await res.json();

    if (res.ok && !data.multipleMatches) {
      await refreshUser();
      router.push(`/${data.churchSlug}/${data.departmentSlug}`);
    }
    return data;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
