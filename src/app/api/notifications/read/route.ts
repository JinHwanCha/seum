import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { ids, all, type } = body as { ids?: string[]; all?: boolean; type?: string };

  const supabase = createClient();

  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', session.userId);

  if (Array.isArray(ids) && ids.length > 0) {
    query = query.in('id', ids);
  } else if (type) {
    query = query.eq('type', type);
  } else if (!all) {
    return NextResponse.json({ error: 'ids, type 또는 all 이 필요합니다.' }, { status: 400 });
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: '처리에 실패했습니다.' }, { status: 500 });

  return NextResponse.json({ success: true });
}
