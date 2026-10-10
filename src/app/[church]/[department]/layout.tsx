import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AnnouncementPopup } from '@/components/notifications/announcement-popup';

// 인증은 미들웨어에서 처리 — 여기까지 도달한 요청은 유효한 세션 보장
export default function DepartmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-page">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="mobile-content min-w-0 flex-1 overflow-hidden px-3 pt-3 sm:px-6 sm:pt-6 max-w-5xl">
          {children}
        </main>
      </div>
      <MobileNav />
      <AnnouncementPopup />
    </div>
  );
}
