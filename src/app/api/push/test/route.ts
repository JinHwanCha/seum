import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (session.requiresGroupSelection) return NextResponse.json({ error: '소속 선택을 완료해주세요.' }, { status: 403 });
  const { data, error } = await createClient().rpc('create_push_test_notification', { p_user_id: session.userId });
  if (error) {
    if (error.message === 'NO_PUSH_DEVICE') {
      return NextResponse.json({ error: '먼저 이 기기의 알림 권한을 허용하고 기기 등록을 완료해주세요.' }, { status: 409 });
    }
    if (error.message === 'PUSH_TEST_RATE_LIMIT') {
      return NextResponse.json({ error: '테스트 알림은 1분 후 다시 요청해주세요.' }, { status: 429 });
    }
    console.error('Push test enqueue failed:', error.code);
    return NextResponse.json({ error: '테스트 알림 저장에 실패했습니다. DB 마이그레이션을 확인해주세요.' }, { status: 503 });
  }
  return NextResponse.json({ success: true, notificationId: data });
}
