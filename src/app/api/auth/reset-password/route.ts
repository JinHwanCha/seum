import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// POST: 비밀번호 초기화 요청 (비로그인 사용자)
export async function POST(request: Request) {
  try {
    const { churchName, name, phone } = await request.json();

    if (!churchName || !name || !phone) {
      return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 });
    }

    const supabase = createClient();

    // Find church
    const { data: church } = await supabase
      .from('churches')
      .select('id')
      .eq('name', churchName.trim())
      .single();

    if (!church) {
      return NextResponse.json({ error: '일치하는 계정을 찾을 수 없습니다.' }, { status: 400 });
    }

    // Find user by church + name + phone
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('church_id', church.id)
      .eq('name', name.trim())
      .eq('phone', phone.trim())
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: '일치하는 계정을 찾을 수 없습니다.' }, { status: 400 });
    }

    // Check if there's already a pending request
    const { data: existing } = await supabase
      .from('password_reset_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '이미 초기화 요청이 접수되어 있습니다. 담당 사역자에게 문의해주세요.' }, { status: 400 });
    }

    // Create reset request
    const { error: insertError } = await supabase
      .from('password_reset_requests')
      .insert({
        user_id: user.id,
        church_id: church.id,
        status: 'pending',
      });

    if (insertError) {
      console.error('Reset request error:', insertError);
      return NextResponse.json({ error: '요청에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password request error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
