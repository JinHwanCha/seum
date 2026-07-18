import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { getBook } from '@/lib/bible';

// 단어 검색: 지금까지 캐시(열람)된 본문 안에서 단어를 포함한 구절을 찾는다.
// (본문 저작권 상 전체 텍스트를 저장하지 않으므로, 읽은 본문 범위 내에서 검색됩니다.)
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const version = searchParams.get('version') || 'kor';

  if (q.length < 2) {
    return NextResponse.json({ error: '두 글자 이상 입력해 주세요.', results: [] }, { status: 400 });
  }

  const supabase = createClient();
  // ilike 특수문자 이스케이프
  const safe = q.replace(/[%_\\]/g, (c) => `\\${c}`);

  const { data, error } = await supabase
    .from('bible_verse_cache')
    .select('book, chapter, verse, text')
    .eq('version', version)
    .ilike('text', `%${safe}%`)
    .order('book', { ascending: true })
    .order('chapter', { ascending: true })
    .order('verse', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: '검색에 실패했습니다.', results: [] }, { status: 500 });

  const results = (data || []).map((r) => ({
    book: r.book,
    bookName: getBook(r.book)?.name || r.book,
    chapter: r.chapter,
    verse: r.verse,
    text: r.text,
  }));

  return NextResponse.json({ results, count: results.length, query: q });
}
