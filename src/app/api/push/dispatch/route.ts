import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { dispatchPushJobs } from '@/lib/push-worker';
import type { PushResult } from '@/lib/push-senders';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function dispatch(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret || secret.length < 32 || process.env.PUSH_SEND_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Push 발송 서버 설정이 완료되지 않았습니다.' }, { status: 503 });
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get('authorization') || '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const started = Date.now();
    let claimed = 0;
    const results: (PushResult & { id: string })[] = [];
    while (claimed < 50 && Date.now() - started < 45000) {
      const batch = await dispatchPushJobs();
      claimed += batch.claimed;
      results.push(...batch.results);
      if (batch.claimed < 5) break;
    }
    return NextResponse.json({ claimed, results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Push dispatch failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Push 작업 처리에 실패했습니다. 서버 로그를 확인해주세요.' }, { status: 503 });
  }
}

export const POST = dispatch;
export const GET = dispatch;
