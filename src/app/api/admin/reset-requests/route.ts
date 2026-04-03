import { NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { canApproveMembers } from '@/lib/permissions';

// GET: 비밀번호 초기화 요청 목록 (관리자용)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createClient();
  const { data: requests } = await supabase
    .from('password_reset_requests')
    .select('*, user:users(id, name, phone)')
    .eq('church_id', session.churchId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return NextResponse.json({ requests: requests || [] });
}

// PATCH: 승인/거절
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canApproveMembers(session.role as any, session.isBureauLeader || session.isBureauMember, session.isAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { requestId, action } = await request.json();

  if (!requestId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createClient();

  // Get the reset request
  const { data: resetReq } = await supabase
    .from('password_reset_requests')
    .select('*, user:users(id, name)')
    .eq('id', requestId)
    .eq('church_id', session.churchId)
    .eq('status', 'pending')
    .single();

  if (!resetReq) {
    return NextResponse.json({ error: '요청을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (action === 'approve') {
    // Reset password to "0000"
    const defaultPassword = '0000';
    const passwordHash = await hashPassword(defaultPassword);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', resetReq.user_id);

    if (updateError) {
      return NextResponse.json({ error: '비밀번호 초기화에 실패했습니다.' }, { status: 500 });
    }
  }

  // Update request status
  await supabase
    .from('password_reset_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      resolved_at: new Date().toISOString(),
      resolved_by: session.userId,
    })
    .eq('id', requestId);

  return NextResponse.json({ success: true });
}
