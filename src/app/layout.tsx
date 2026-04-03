import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://seum-nu.vercel.app'),
  title: '세움 - 교회 공동체 나눔 플랫폼',
  description: '소그룹 관리 및 교회 공동체 커뮤니케이션 통합 플랫폼',
  openGraph: {
    title: '세움 - 교회 공동체 나눔 플랫폼',
    description: '소그룹 관리 및 교회 공동체 커뮤니케이션 통합 플랫폼',
    siteName: '세움',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
