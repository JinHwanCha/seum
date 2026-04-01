import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { createToken, verifyPassword } from '@/lib/auth';
import { COOKIE_NAME } from '@/lib/constants';
import { maskPhone } from '@/lib/utils';
import type { SessionPayload } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { churchName, name, password, selectedUserId, rememberMe } = await request.json();

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

    // Verify password against all matching users
    const matchedUsers = [];
    for (const user of users) {
      const valid = await verifyPassword(password, user.password_hash);
      if (valid) matchedUsers.push(user);
    }

    if (matchedUsers.length === 0) {
      return NextResponse.json(
        { error: '이름 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // Multiple matches - ask user to select
    if (matchedUsers.length > 1 && !selectedUserId) {
      return NextResponse.json({
        multipleMatches: true,
        users: matchedUsers.map((u) => ({
          id: u.id,
          phone: maskPhone(u.phone),
        })),
      });
    }

    const user = matchedUsers[0];
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
      isAdmin: user.is_admin ?? false,
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
