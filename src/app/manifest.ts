import type { MetadataRoute } from 'next';

// Android/Chrome '홈 화면에 추가' 및 PWA 설치 시 사용하는 매니페스트.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '세움 - 교회 공동체 나눔 플랫폼',
    short_name: '세움',
    description: '소그룹 관리 및 교회 공동체 커뮤니케이션 통합 플랫폼',
    start_url: '/',
    display: 'standalone',
    background_color: '#4a7d57',
    theme_color: '#4a7d57',
    lang: 'ko',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
