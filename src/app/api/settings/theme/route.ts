import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { isValidTheme } from '@/lib/themes';

// 저장된 테마 조회
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('theme')
    .eq('id', session.userId)
    .single();

  if (error) return NextResponse.json({ theme: null });
  return NextResponse.json({ theme: data?.theme ?? null });
}

// 테마 저장
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !isValidTheme(body.theme)) {
    return NextResponse.json({ error: '잘못된 테마입니다.' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('users')
    .update({ theme: body.theme })
    .eq('id', session.userId);

  if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true, theme: body.theme });
}
