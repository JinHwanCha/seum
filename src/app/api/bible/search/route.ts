import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { getBook } from '@/lib/bible';
import { searchKrv } from '@/lib/bible-krv';

// 단어 검색.
//  - 개역개정(kor): 전체 본문에서 즉시 검색
//  - 그 외(NIV 등): 지금까지 캐시(열람)된 본문 범위 내에서 검색
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const version = searchParams.get('version') || 'kor';

  if (q.length < 2) {
    return NextResponse.json({ error: '두 글자 이상 입력해 주세요.', results: [] }, { status: 400 });
  }

  // 개역개정: 로컬 전체 본문 검색
  if (version === 'kor') {
    const found = searchKrv(q, 300);
    const results = found.map((r) => ({
      book: r.book,
      bookName: getBook(r.book)?.name || r.book,
      chapter: r.chapter,
      verse: r.verse,
      text: r.text,
    }));
    return NextResponse.json({ results, count: results.length, query: q });
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
