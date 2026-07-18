import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { getBook } from '@/lib/bible';

// 내 읽기 진도 조회
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('bible_reading_progress')
    .select('book, chapter, read_at')
    .eq('user_id', session.userId);

  if (error) return NextResponse.json({ error: '진도를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ progress: data || [] });
}

// 장 읽음 표시 (토글 지원: read=false 이면 삭제)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const { book: bookCode, chapter, read = true } = body;
  const book = getBook(bookCode);
  const ch = parseInt(String(chapter), 10);
  if (!book || !ch || ch < 1 || ch > book.chapters) {
    return NextResponse.json({ error: '잘못된 성경/장입니다.' }, { status: 400 });
  }

  const supabase = createClient();

  if (!read) {
    const { error } = await supabase
      .from('bible_reading_progress')
      .delete()
      .eq('user_id', session.userId)
      .eq('book', bookCode)
      .eq('chapter', ch);
    if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ ok: true, read: false });
  }

  const { error } = await supabase.from('bible_reading_progress').upsert(
    {
      user_id: session.userId,
      department_id: session.departmentId,
      book: bookCode,
      chapter: ch,
      read_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,book,chapter' }
  );
  if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ ok: true, read: true });
}
