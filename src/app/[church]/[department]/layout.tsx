'use client';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useAuth } from '@/hooks/use-auth';

export default function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f3]">
        <div className="animate-pulse text-primary-600 text-lg font-medium">세움</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 max-w-5xl">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
