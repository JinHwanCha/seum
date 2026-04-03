import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();

  const [{ data: church }, { data: department }, { data: roleLabels }] = await Promise.all([
    supabase.from('churches').select('name, pastor_name').eq('id', session.churchId).single(),
    supabase.from('departments').select('name').eq('id', session.departmentId).single(),
    supabase.from('role_labels').select('*').eq('department_id', session.departmentId),
  ]);

  return NextResponse.json({
    settings: {
      church_name: church?.name,
      pastor_name: church?.pastor_name,
      department_name: department?.name,
    },
    roleLabels: roleLabels || [],
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.ministerRank !== 'pastor') {
    return NextResponse.json({ error: '목사님만 수정 가능합니다.' }, { status: 403 });
  }

  const { roleLabels } = await request.json();
  const supabase = createClient();

  // Batch upsert role labels
  const upsertData = Object.entries(roleLabels).map(([roleKey, label]) => ({
    department_id: session.departmentId,
    role_key: roleKey,
    label: label as string,
  }));

  await supabase
    .from('role_labels')
    .upsert(upsertData, { onConflict: 'department_id,role_key' });

  return NextResponse.json({ success: true });
}
