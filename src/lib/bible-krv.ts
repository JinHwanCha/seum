// ─── 개역개정 본문 로더 (서버 전용) ──────────────────────────
// 사용자가 제공한 src/data/bible-krv.json 을 인덱싱해 본문 조회 / 단어 검색을 제공한다.
// 클라이언트 번들에 포함되지 않도록 API 라우트에서만 import 할 것.

import raw from '@/data/bible-krv.json';
import { BIBLE_BOOKS, type BibleVerse } from './bible';

const DATA = raw as Record<string, string>;

// 한글 약칭(창, 삼상 ...) → 책 코드(genesis, 1samuel ...)
const ABBR_TO_CODE: Record<string, string> = {};
for (const b of BIBLE_BOOKS) ABBR_TO_CODE[b.abbr] = b.code;

interface FlatVerse {
  code: string;
  chapter: number;
  verse: number;
  text: string;
}

// code → (chapter → verses)
const INDEX = new Map<string, Map<number, BibleVerse[]>>();
// 검색용 정경 순서 평탄화 목록
const FLAT: FlatVerse[] = [];

let built = false;
function build() {
  if (built) return;
  built = true;
  const keyRe = /^([가-힣]+)(\d+):(\d+)$/;
  for (const key in DATA) {
    const m = keyRe.exec(key);
    if (!m) continue;
    const code = ABBR_TO_CODE[m[1]];
    if (!code) continue;
    const chapter = parseInt(m[2], 10);
    const verse = parseInt(m[3], 10);
    const text = (DATA[key] || '').trim();
    if (!text) continue;

    let chMap = INDEX.get(code);
    if (!chMap) {
      chMap = new Map();
      INDEX.set(code, chMap);
    }
    let arr = chMap.get(chapter);
    if (!arr) {
      arr = [];
      chMap.set(chapter, arr);
    }
    arr.push({ verse, text });
    FLAT.push({ code, chapter, verse, text });
  }
  INDEX.forEach((chMap) => {
    chMap.forEach((arr) => {
      arr.sort((a, b) => a.verse - b.verse);
    });
  });
}

// 개역개정 지원 여부
export function hasKrv(): boolean {
  build();
  return FLAT.length > 0;
}

export function getKrvChapter(code: string, chapter: number): BibleVerse[] | null {
  build();
  const arr = INDEX.get(code)?.get(chapter);
  return arr ? arr.map((v) => ({ verse: v.verse, text: v.text })) : null;
}

export interface KrvSearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

// 전체 개역개정 본문에서 단어를 포함한 구절 검색 (정경 순서)
export function searchKrv(query: string, limit = 300): KrvSearchResult[] {
  build();
  const q = query.trim();
  if (!q) return [];
  const results: KrvSearchResult[] = [];
  for (const v of FLAT) {
    if (v.text.includes(q)) {
      results.push({ book: v.code, chapter: v.chapter, verse: v.verse, text: v.text });
      if (results.length >= limit) break;
    }
  }
  return results;
}
