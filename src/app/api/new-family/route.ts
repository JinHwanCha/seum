import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import type { SessionPayload } from '@/lib/types';

const WEEK_FIELDS = ['week1_date', 'week2_date', 'week3_date', 'week4_date', 'week5_date', 'week6_date'];
const PROFILE_FIELDS = ['name', 'phone', 'birth_date', 'note', 'prayer_request'];
const LEADER_ROLES = ['cell_leader', 'village_leader', 'minister'];

const isDateStr = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

interface NewFamilyContext {
  role: string;
  isAdmin: boolean;
  isNewFamilyTeam: boolean;
  canManage: boolean;   // 새가족 등록/편집 가능
  isOversight: boolean; // 마을 전체 열람/관리 가능(마을장/사역자/관리자)
}

// 세션 JWT는 stale할 수 있어 users에서 최신 role/village를 조회한다.
async function getContext(session: SessionPayload): Promise<NewFamilyContext> {
  const supabase = createClient();
  const { data: u } = await supabase
    .from('users')
    .select('role, village_id, is_admin')
    .eq('id', session.userId)
    .single();

  const role = (u?.role as string) ?? session.role;
  const villageId = u?.village_id ?? session.villageId ?? null;
  const isAdmin = (u?.is_admin as boolean) ?? session.isAdmin;

  let isNewFamilyTeam = false;
  if (villageId) {
    const { data: v } = await supabase
      .from('villages')
      .select('is_new_member_team')
      .eq('id', villageId)
      .single();
    isNewFamilyTeam = !!v?.is_new_member_team;
  }

  const isLeader = LEADER_ROLES.includes(role);
  const canManage = isAdmin || (isNewFamilyTeam && isLeader);
  const isOversight = isAdmin || (isNewFamilyTeam && (role === 'village_leader' || role === 'minister'));
  return { role, isAdmin, isNewFamilyTeam, canManage, isOversight };
}

// GET: 내가 담당하는 새가족 목록
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  // 권한 컨텍스트와 명단 조회를 병렬로 실행해 왕복 지연을 줄인다.
  // 명단은 leader_id=본인 조건이라 권한 실패 시 그냥 버리면 되어 정보 노출이 없다.
  const [ctx, mineResult] = await Promise.all([
    getContext(session),
    supabase
      .from('new_family_members')
      .select('*')
      .eq('leader_id', session.userId)
      .order('created_at', { ascending: true }),
  ]);

  if (!ctx.canManage) return NextResponse.json({ members: [], canManage: false });

  return NextResponse.json({ members: mineResult.data || [], canManage: true });
}

// POST: 새가족 추가
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getContext(session);
  if (!ctx.canManage) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });

  const birthDate = isDateStr(body.birth_date) ? body.birth_date : null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('new_family_members')
    .insert({
      department_id: session.departmentId,
      leader_id: session.userId,
      name,
      phone: typeof body.phone === 'string' ? body.phone.trim() : '',
      birth_date: birthDate,
      note: typeof body.note === 'string' ? body.note.trim() : '',
      prayer_request: typeof body.prayer_request === 'string' ? body.prayer_request.trim() : '',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

// PATCH: 프로필 수정 또는 주차 출석 체크(단일 필드 fire-and-forget)
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getContext(session);
  if (!ctx.canManage) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

  const body = await request.json();
  const { id, field, value } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  const { data: target } = await supabase
    .from('new_family_members')
    .select('id, leader_id')
    .eq('id', id)
    .single();
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (target.leader_id !== session.userId && !ctx.isOversight) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof field === 'string') {
    // 단일 필드 업데이트(주차 출석 토글용)
    if (WEEK_FIELDS.includes(field)) {
      if (value !== null && !isDateStr(value)) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      update[field] = value;
    } else if (field === 'birth_date') {
      update[field] = isDateStr(value) ? value : null;
    } else if (PROFILE_FIELDS.includes(field)) {
      update[field] = typeof value === 'string' ? value.trim() : '';
    } else {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }
  } else {
    // 프로필 일괄 수정
    if (typeof body.name === 'string') {
      const n = body.name.trim();
      if (!n) return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
      update.name = n;
    }
    if (typeof body.phone === 'string') update.phone = body.phone.trim();
    if (typeof body.note === 'string') update.note = body.note.trim();
    if (typeof body.prayer_request === 'string') update.prayer_request = body.prayer_request.trim();
    if ('birth_date' in body) update.birth_date = isDateStr(body.birth_date) ? body.birth_date : null;
  }

  const { error } = await supabase.from('new_family_members').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: 졸업/장기미결 삭제 (행 제거)
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getContext(session);
  if (!ctx.canManage) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  const { data: target } = await supabase
    .from('new_family_members')
    .select('id, leader_id')
    .eq('id', id)
    .single();
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (target.leader_id !== session.userId && !ctx.isOversight) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const { error } = await supabase.from('new_family_members').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
