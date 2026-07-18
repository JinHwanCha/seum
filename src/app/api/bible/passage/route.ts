import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { getBook, getVersion, type BibleVerse } from '@/lib/bible';
import { getKrvChapter } from '@/lib/bible-krv';

// iBibles quote.php 응답(HTML)을 파싱해 구절 배열로 변환
function parsePassage(html: string, chapter: number): BibleVerse[] {
  // 태그 제거 → 공백 정리
  const text = html
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const verses: BibleVerse[] = [];
  // "장:절 본문" 마커를 기준으로 분리. 요청한 장(chapter)과 일치하는 마커만 사용.
  const markerRe = new RegExp(`(?:^|\\s)${chapter}:(\\d+)\\s`, 'g');
  const matches: { verse: number; index: number; markerEnd: number }[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = markerRe.exec(text)) !== null) {
    matches.push({
      verse: parseInt(mm[1], 10),
      index: mm.index,
      markerEnd: markerRe.lastIndex,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].markerEnd;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text
      .slice(start, end)
      .replace(/\s*!\s*$/, '')
      .replace(/\n/g, ' ')
      .trim();
    if (body) verses.push({ verse: matches[i].verse, text: body });
  }
  return verses;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookCode = searchParams.get('book') || '';
  const chapter = parseInt(searchParams.get('chapter') || '0', 10);
  const versionKey = searchParams.get('version') || 'kor';

  const book = getBook(bookCode);
  if (!book) return NextResponse.json({ error: '존재하지 않는 성경입니다.' }, { status: 400 });
  if (!chapter || chapter < 1 || chapter > book.chapters) {
    return NextResponse.json({ error: '존재하지 않는 장입니다.' }, { status: 400 });
  }

  const version = getVersion(versionKey);

  // 개역개정(kor)은 로컬 데이터에서 즉시 제공
  if (version.key === 'kor') {
    const verses = getKrvChapter(bookCode, chapter);
    if (!verses || verses.length === 0) {
      return NextResponse.json({ error: '본문을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ book: bookCode, chapter, version: 'kor', verses });
  }

  const supabase = createClient();

  // 1) 캐시 조회 (NIV 등 외부 번역본)
  const { data: cached } = await supabase
    .from('bible_verse_cache')
    .select('verse, text')
    .eq('version', version.key)
    .eq('book', bookCode)
    .eq('chapter', chapter)
    .order('verse', { ascending: true });

  if (cached && cached.length > 0) {
    return NextResponse.json({
      book: bookCode,
      chapter,
      version: version.key,
      verses: cached.map((c) => ({ verse: c.verse, text: c.text })),
    });
  }

  // 2) iBibles 프록시 (서버사이드 fetch — http mixed-content 회피)
  const url = `http://ibibles.net/quote.php?${version.apiCode}-${bookCode}/${chapter}:1-${chapter}:200`;
  let verses: BibleVerse[] = [];
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeumBible/1.0)' },
      // 본문은 잘 바뀌지 않으므로 하루 캐시
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const html = await res.text();
    verses = parsePassage(html, chapter);
  } catch {
    return NextResponse.json({ error: '본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }

  if (verses.length === 0) {
    return NextResponse.json({ error: '본문을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 3) 캐시에 저장 (검색 인덱스로도 사용) — 실패해도 응답은 반환
  await supabase.from('bible_verse_cache').upsert(
    verses.map((v) => ({
      version: version.key,
      book: bookCode,
      chapter,
      verse: v.verse,
      text: v.text,
    })),
    { onConflict: 'version,book,chapter,verse', ignoreDuplicates: true }
  );

  return NextResponse.json({ book: bookCode, chapter, version: version.key, verses });
}
