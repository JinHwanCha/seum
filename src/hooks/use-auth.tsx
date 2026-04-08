'use client';

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
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

const authFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  });

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  const { data, isLoading, mutate } = useSWR(
    isAuthPage ? null : '/api/auth/me',
    authFetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const user = data?.user ?? null;
  const loading = isAuthPage ? false : isLoading;

  const refreshUser = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const login = useCallback(async (
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
      await mutate();
      router.push(`/${resData.churchSlug}/${resData.departmentSlug}`);
    }
    return resData;
  }, [mutate, router]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await mutate(null, false);
    router.push('/login');
  }, [mutate, router]);

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
