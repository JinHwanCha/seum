import type { MetadataRoute } from 'next';

// Android/Chrome '홈 화면에 추가' 및 PWA 설치 시 사용하는 매니페스트.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '세움 - 교회 공동체 나눔 플랫폼',
    short_name: '세움',
    description: '소그룹 관리 및 교회 공동체 커뮤니케이션 통합 플랫폼',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#4a7d57',
    theme_color: '#4a7d57',
    lang: 'ko',
    categories: ['social', 'productivity'],
    icons: [
      { src: '/pwa-icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
