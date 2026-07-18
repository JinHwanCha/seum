import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { getBook } from '@/lib/bible';

// 내 북마크 / 형광펜 조회. ?book=&chapter= 지정시 해당 장만.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const book = searchParams.get('book');
  const chapter = searchParams.get('chapter');

  const supabase = createClient();
  let query = supabase
    .from('bible_bookmarks')
    .select('id, book, chapter, verse, type, color, note, created_at')
    .eq('user_id', session.userId);

  if (book) query = query.eq('book', book);
  if (chapter) query = query.eq('chapter', parseInt(chapter, 10));

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: '북마크를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ bookmarks: data || [] });
}

// 북마크/형광펜 추가 또는 토글
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

  const { book: bookCode, chapter, verse, type = 'bookmark', color = 'yellow', note } = body;
  const book = getBook(bookCode);
  const ch = parseInt(String(chapter), 10);
  const v = parseInt(String(verse), 10);
  if (!book || !ch || !v || (type !== 'bookmark' && type !== 'highlight')) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const supabase = createClient();

  // 이미 있으면 제거(토글), 없으면 추가
  const { data: existing } = await supabase
    .from('bible_bookmarks')
    .select('id, color')
    .eq('user_id', session.userId)
    .eq('book', bookCode)
    .eq('chapter', ch)
    .eq('verse', v)
    .eq('type', type)
    .maybeSingle();

  if (existing) {
    // 형광펜이고 색상이 다르면 색상만 변경, 같으면 제거
    if (type === 'highlight' && existing.color !== color) {
      const { error } = await supabase
        .from('bible_bookmarks')
        .update({ color })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
      return NextResponse.json({ ok: true, action: 'updated', color });
    }
    const { error } = await supabase.from('bible_bookmarks').delete().eq('id', existing.id);
    if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
    return NextResponse.json({ ok: true, action: 'removed' });
  }

  const { data, error } = await supabase
    .from('bible_bookmarks')
    .insert({
      user_id: session.userId,
      department_id: session.departmentId,
      book: bookCode,
      chapter: ch,
      verse: v,
      type,
      color,
      note: note || null,
    })
    .select('id, book, chapter, verse, type, color, note')
    .single();

  if (error) return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ ok: true, action: 'added', bookmark: data });
}

// 북마크 삭제 ?id=
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createClient();
  const { error } = await supabase
    .from('bible_bookmarks')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId);

  if (error) return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
