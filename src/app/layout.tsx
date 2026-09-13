import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/providers';
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar';
import { getSession } from '@/lib/auth';
import { DEFAULT_THEME, THEME_PAGE_BG } from '@/lib/themes';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: THEME_PAGE_BG[DEFAULT_THEME],
};

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
        {/* 이미지가 저장된 Supabase Storage 로의 연결(DNS/TLS)을 미리 열어 다운로드를 앞당긴다 */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        )}
        {/* 페인트 전에 저장된 테마를 적용해 깜빡임(FOUC) 방지 + 상태표시줄 색을 테마 배경에 맞춤 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=${JSON.stringify(THEME_PAGE_BG)};var t=localStorage.getItem('seum-theme');if(!m[t])t='${DEFAULT_THEME}';document.documentElement.setAttribute('data-theme',t);var e=document.querySelector('meta[name="theme-color"]');if(!e){e=document.createElement('meta');e.setAttribute('name','theme-color');document.head.appendChild(e);}e.setAttribute('content',m[t]);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <Providers initialUser={session}>{children}</Providers>
      </body>
    </html>
  );
}
