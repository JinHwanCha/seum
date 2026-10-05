import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { parseInstallationId, parsePushRegistration } from '@/lib/push-validation';

async function readBody(request: Request): Promise<unknown> {
  try { return await request.json(); }
  catch (error) { if (error instanceof SyntaxError) return null; throw error; }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (session.requiresGroupSelection) return NextResponse.json({ error: '소속 선택을 완료해주세요.' }, { status: 403 });
  const registration = parsePushRegistration(await readBody(request));
  if (!registration || !session.exp || session.exp * 1000 <= Date.now()) {
    return NextResponse.json({ error: '유효한 기기 정보와 로그인 세션이 필요합니다.' }, { status: 400 });
  }
  const { error } = await createClient().rpc('register_push_device', {
    p_installation_id: registration.installationId,
    p_user_id: session.userId,
    p_platform: registration.platform,
    p_provider: registration.provider,
    p_environment: registration.environment,
    p_token: registration.token,
    p_session_expires_at: new Date(session.exp * 1000).toISOString(),
  });
  if (error) {
    console.error('Push device registration failed:', error.code);
    return NextResponse.json({ error: '알림 기기 등록에 실패했습니다. 서버 DB 설정을 확인해주세요.' }, { status: 503 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const installationId = parseInstallationId(await readBody(request));
  if (!installationId) return NextResponse.json({ error: '유효한 기기 ID가 필요합니다.' }, { status: 400 });
  const { error } = await createClient().from('push_devices')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('installation_id', installationId).eq('user_id', session.userId);
  if (error) {
    console.error('Push device removal failed:', error.code);
    return NextResponse.json({ error: '알림 기기 해제에 실패했습니다.' }, { status: 503 });
  }
  return NextResponse.json({ success: true });
}
