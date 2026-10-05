import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { UUID_PATTERN } from '@/lib/push-validation';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!UUID_PATTERN.test(params.id)) return NextResponse.json({ error: '유효한 알림 ID가 필요합니다.' }, { status: 400 });
  const supabase = createClient();
  const { data: notification, error } = await supabase.from('notifications')
    .select('id, post_id, department_id, post:posts(id, slug, board_type, author_id, visibility, village_id, department_id)')
    .eq('id', params.id).eq('recipient_id', session.userId).eq('department_id', session.departmentId).maybeSingle();
  if (error) {
    console.error('Push notification lookup failed:', error.code);
    return NextResponse.json({ error: '알림을 확인하지 못했습니다.' }, { status: 503 });
  }
  if (!notification) return NextResponse.json({ error: '이 계정에서 확인할 수 없는 알림입니다.' }, { status: 404 });
  const basePath = `/${encodeURIComponent(session.churchSlug)}/${encodeURIComponent(session.departmentSlug)}`;
  let href = `${basePath}/notifications`;
  if (notification.post_id) {
    const post = Array.isArray(notification.post) ? notification.post[0] : notification.post;
    const canView = post && post.department_id === session.departmentId &&
      (post.author_id === session.userId || session.role === 'minister' ||
      post.visibility === 'all' || (post.visibility === 'village' &&
        (session.role === 'village_leader' || (post.village_id && post.village_id === session.villageId))));
    if (!canView) return NextResponse.json({ error: '게시글이 삭제되었거나 접근 권한이 없습니다.' }, { status: 404 });
    href = `${basePath}/boards/${encodeURIComponent(post.board_type)}/${encodeURIComponent(post.slug || post.id)}`;
  }
  return NextResponse.json({ href }, { headers: { 'Cache-Control': 'no-store' } });
}
