import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { getSession } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://seum.life'),
  title: '세움 - 교회 공동체 나눔 플랫폼',
  description: '소그룹 관리 및 교회 공동체 커뮤니케이션 통합 플랫폼',
  keywords: ['세움', '교회', '공동체', '소그룹', '나눔', '교회 플랫폼', '셀 관리'],
  appleWebApp: {
    capable: true,
    title: '세움',
    statusBarStyle: 'default',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: '세움 - 교회 공동체 나눔 플랫폼',
    description: '소그룹 관리 및 교회 공동체 커뮤니케이션 통합 플랫폼',
    siteName: '세움',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="ko">
      <head>
        {/* 페인트 전에 저장된 테마를 적용해 깜빡임(FOUC) 방지 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('seum-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers initialUser={session}>{children}</Providers>
      </body>
    </html>
  );
}
