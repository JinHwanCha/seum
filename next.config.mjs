/** @type {import('next').NextConfig} */
const nextConfig = {
  // 응답 gzip 압축(대용량 base64 이미지 페이로드 전송량 감소)
  compress: true,
  // X-Powered-By 헤더 제거(불필요한 응답 헤더 축소)
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
    // 아이콘/유틸 라이브러리를 실제 사용하는 심볼만 트리셰이킹 →
    // 페이지별 JS 번들 크기와 초기 로딩 속도 대폭 개선
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};

export default nextConfig;
