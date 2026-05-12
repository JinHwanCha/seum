import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';

// 인증은 미들웨어에서 처리 — 여기까지 도달한 요청은 유효한 세션 보장
export default function DepartmentLayout({ children }: { children: React.ReactNode }) {
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
