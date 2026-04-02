import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'validateChurch') {
    const churchName = searchParams.get('churchName')?.trim().replace(/^['‘’“”"]+|['‘’“”"]+$/g, '');
    const pastorName = searchParams.get('pastorName')?.trim().replace(/^['‘’“”"]+|['‘’“”"]+$/g, '');

    if (!churchName || !pastorName) {
      return NextResponse.json({ valid: false });
    }

    const supabase = createClient();
    const { data: church } = await supabase
      .from('churches')
      .select('id, name, pastor_name')
      .eq('name', churchName)
      .eq('pastor_name', pastorName)
      .single();

    if (!church) {
      return NextResponse.json({ valid: false });
    }

    const { data: departments } = await supabase
      .from('departments')
      .select('id, name')
      .eq('church_id', church.id);

    return NextResponse.json({
      valid: true,
      departments: departments || [],
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, birthDate, phone, departmentId, password } = body;
    const churchName = body.churchName?.trim().replace(/^['‘’“”"]+|['‘’“”"]+$/g, '');
    const pastorName = body.pastorName?.trim().replace(/^['‘’“”"]+|['‘’“”"]+$/g, '');

    if (!churchName || !pastorName || !name || !phone || !departmentId || !password) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 });
    }

    const supabase = createClient();

    // Validate church
    const { data: church } = await supabase
      .from('churches')
      .select('id')
      .eq('name', churchName)
      .eq('pastor_name', pastorName)
      .single();

    if (!church) {
      return NextResponse.json({ error: '교회 정보가 일치하지 않습니다.' }, { status: 400 });
    }

    // Validate department belongs to church
    const { data: department } = await supabase
      .from('departments')
      .select('id')
      .eq('id', departmentId)
      .eq('church_id', church.id)
      .single();

    if (!department) {
      return NextResponse.json({ error: '잘못된 부서입니다.' }, { status: 400 });
    }

    // Check duplicate phone in same church
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('church_id', church.id)
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '이미 가입된 전화번호입니다.' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { error: insertError } = await supabase.from('users').insert({
      name,
      birth_date: birthDate || null,
      phone,
      password_hash: passwordHash,
      church_id: church.id,
      department_id: departmentId,
      role: 'pending',
      is_approved: false,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: '회원가입에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
