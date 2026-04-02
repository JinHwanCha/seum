import { NextResponse } from 'next/server';
import { getSession, hashPassword, verifyPassword } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, name, birth_date, phone, role, minister_rank, village_id, cell_id, is_admin')
    .eq('id', session.userId)
    .single();

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { birthDate, phone, currentPassword, newPassword } = body;

  const supabase = createClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (birthDate !== undefined) updates.birth_date = birthDate || null;
  if (phone !== undefined) updates.phone = phone;

  // Password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: '현재 비밀번호를 입력해주세요.' }, { status: 400 });
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: '새 비밀번호는 4자 이상이어야 합니다.' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', session.userId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 });
    }

    updates.password_hash = await hashPassword(newPassword);
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', session.userId);

  if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });

  return NextResponse.json({ success: true });
}
