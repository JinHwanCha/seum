import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { COOKIE_NAME } from '@/lib/constants';

// Edge 런타임에서 모듈 레벨 Uint8Array가 올바르게 직렬화되지 않을 수 있으므로
// 미들웨어 함수 내에서 직접 키를 생성합니다
function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'seum-dev-secret-key-change-in-production-32ch'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/opengraph-image') ||
    pathname.startsWith('/icon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    // HTTP 헤더는 ASCII만 허용하므로 non-ASCII 문자(한글 등)를 \uXXXX 이스케이프로 인코딩
    const safePayload = JSON.stringify(payload).replace(
      /[\u007F-\uFFFF]/g,
      (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
    );
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-session-payload', safePayload);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
