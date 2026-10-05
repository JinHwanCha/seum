import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/constants';
import { getCookieSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { parseInstallationId } from '@/lib/push-validation';

export async function POST(request: Request) {
  if (request.headers.get('content-type')?.includes('application/json')) {
    let body: unknown;
    try { body = await request.json(); }
    catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return NextResponse.json({ error: '기기 정보가 올바르지 않습니다.' }, { status: 400 });
    }
    const installationId = parseInstallationId(body);
    if (!installationId) return NextResponse.json({ error: '기기 ID가 필요합니다.' }, { status: 400 });
    const session = await getCookieSession();
    if (session) {
      const { error } = await createClient().from('push_devices')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('installation_id', installationId).eq('user_id', session.userId);
      if (error) {
        console.error('Push revocation before logout failed:', error.code);
        return NextResponse.json({ error: '알림 기기 해제에 실패했습니다. 다시 시도해주세요.' }, { status: 503 });
      }
    }
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
