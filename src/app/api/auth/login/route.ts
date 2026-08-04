import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { createToken, verifyPassword } from '@/lib/auth';
import { COOKIE_NAME } from '@/lib/constants';
import { maskPhone } from '@/lib/utils';
import type { SessionPayload } from '@/lib/types';

// 생년월일 비교용 정규화: 숫자만 남겨 "2000-01-15" / "20000115" 등 형식 차이를 흡수
function normalizeBirth(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export async function POST(request: Request) {
  try {
    const { churchName, name, password, selectedUserId, rememberMe, birthDate } = await request.json();

    if (!churchName || !name || !password) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    const supabase = createClient();

    // Find church
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, slug')
      .eq('name', churchName)
      .single();

    console.log('[LOGIN] churchName:', churchName, 'church:', church, 'error:', churchError);

    if (!church) {
      return NextResponse.json({ error: '교회를 찾을 수 없습니다.' }, { status: 401 });
    }

    // Find matching users
    let query = supabase
      .from('users')
      .select('*, department:departments(slug)')
      .eq('church_id', church.id)
      .eq('name', name)
      .eq('is_approved', true);

    if (selectedUserId) {
      query = query.eq('id', selectedUserId);
    }

    const { data: users } = await query;

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: '이름 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // Verify password - parallelize bcrypt checks
    const matchedUsers: typeof users = [];
    if (selectedUserId) {
      // Single user selected - just verify that one
      const user = users[0];
      const valid = await verifyPassword(password, user.password_hash);
      if (valid) matchedUsers.push(user);
    } else {
      // Check all matching users in parallel
      const results = await Promise.all(
        users.map(async (user) => ({
          user,
          valid: await verifyPassword(password, user.password_hash),
        }))
      );
      results.forEach(({ user, valid }) => {
        if (valid) matchedUsers.push(user);
      });
    }

    if (matchedUsers.length === 0) {
      return NextResponse.json(
        { error: '이름 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // Multiple matches (동명이인 + 동일 비밀번호) - 생년월일로 우선 구분
    let user = matchedUsers[0];
    if (matchedUsers.length > 1 && !selectedUserId) {
      const inputBirth = normalizeBirth(birthDate);

      if (!inputBirth) {
        // 생년월일 입력을 먼저 요청
        return NextResponse.json({ requireBirthDate: true });
      }

      const byBirth = matchedUsers.filter(
        (u) => normalizeBirth(u.birth_date) === inputBirth
      );

      if (byBirth.length === 1) {
        user = byBirth[0];
      } else if (byBirth.length === 0) {
        return NextResponse.json(
          { error: '생년월일이 일치하지 않습니다.', requireBirthDate: true },
          { status: 401 }
        );
      } else {
        // 생년월일까지 동일한 경우에만 전화번호로 최종 선택
        return NextResponse.json({
          multipleMatches: true,
          users: byBirth.map((u) => ({
            id: u.id,
            phone: maskPhone(u.phone),
          })),
        });
      }
    }

    const dept = user.department as any;

    // Check bureau membership
    const { data: bureauMembership } = await supabase
      .from('bureau_members')
      .select('is_leader')
      .eq('user_id', user.id)
      .maybeSingle();

    const payload: SessionPayload = {
      userId: user.id,
      name: user.name,
      churchId: user.church_id,
      churchSlug: church.slug,
      departmentId: user.department_id,
      departmentSlug: dept?.slug || '',
      role: user.role,
      ministerRank: user.minister_rank,
      villageId: user.village_id,
      cellId: user.cell_id,
      isBureauLeader: bureauMembership?.is_leader ?? false,
      isBureauMember: !!bureauMembership,
      isAdmin: user.is_admin || user.minister_rank === 'pastor',
    };

    const tokenExpiry = rememberMe ? '30d' : '7d';
    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const token = await createToken(payload, tokenExpiry);

    const response = NextResponse.json({
      success: true,
      churchSlug: church.slug,
      departmentSlug: dept?.slug || '',
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
