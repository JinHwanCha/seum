import { NextResponse } from 'next/server';
import { getSession, verifyPassword } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password) {
    return NextResponse.json({ error: '현재 비밀번호를 입력해주세요.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', session.userId)
    .single();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 });
  }

  const { error } = await supabase.from('account_deletion_requests').upsert(
    {
      user_id: session.userId,
      church_id: session.churchId,
      department_id: session.departmentId,
      status: 'pending',
      requested_at: new Date().toISOString(),
      resolved_at: null,
      resolved_by: null,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('Account deletion request error:', error);
    return NextResponse.json({ error: '탈퇴 요청을 접수하지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}