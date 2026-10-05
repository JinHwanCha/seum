import type { MetadataRoute } from 'next';

const BASE_URL = 'https://seum-nu.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register'],
      // 로그인이 필요한 비공개 영역은 검색 크롤링에서 제외
      disallow: ['/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
