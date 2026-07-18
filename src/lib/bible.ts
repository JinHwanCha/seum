// ─── 성경(Bible) 메타데이터 & 유틸 ──────────────────────────
// 본문 텍스트는 저장하지 않는다. (저작권) 런타임에 iBibles에서 프록시로 불러온다.

export type BibleVersion = 'kor' | 'niv';

export interface BibleVersionInfo {
  key: BibleVersion;
  label: string;      // UI 표시명
  short: string;      // 짧은 배지
  apiCode: string;    // iBibles 버전 코드
}

// iBibles 가 지원하는 버전. 'kor' = 개역 계열 한글 번역.
export const BIBLE_VERSIONS: BibleVersionInfo[] = [
  { key: 'kor', label: '개역개정', short: '개역', apiCode: 'kor' },
  { key: 'niv', label: 'NIV (영문)', short: 'NIV', apiCode: 'niv' },
];

export const DEFAULT_VERSION: BibleVersion = 'kor';

export interface BibleBook {
  code: string;       // iBibles 책 코드 (영문 소문자)
  name: string;       // 한글 이름 (예: 창세기)
  abbr: string;       // 축약형 (예: 창)
  chapters: number;   // 장 수
  testament: 'old' | 'new';
}

// 66권 — code 는 iBibles quote.php 에서 사용하는 영문 책 이름
export const BIBLE_BOOKS: BibleBook[] = [
  { code: 'genesis', name: '창세기', abbr: '창', chapters: 50, testament: 'old' },
  { code: 'exodus', name: '출애굽기', abbr: '출', chapters: 40, testament: 'old' },
  { code: 'leviticus', name: '레위기', abbr: '레', chapters: 27, testament: 'old' },
  { code: 'numbers', name: '민수기', abbr: '민', chapters: 36, testament: 'old' },
  { code: 'deuteronomy', name: '신명기', abbr: '신', chapters: 34, testament: 'old' },
  { code: 'joshua', name: '여호수아', abbr: '수', chapters: 24, testament: 'old' },
  { code: 'judges', name: '사사기', abbr: '삿', chapters: 21, testament: 'old' },
  { code: 'ruth', name: '룻기', abbr: '룻', chapters: 4, testament: 'old' },
  { code: '1samuel', name: '사무엘상', abbr: '삼상', chapters: 31, testament: 'old' },
  { code: '2samuel', name: '사무엘하', abbr: '삼하', chapters: 24, testament: 'old' },
  { code: '1kings', name: '열왕기상', abbr: '왕상', chapters: 22, testament: 'old' },
  { code: '2kings', name: '열왕기하', abbr: '왕하', chapters: 25, testament: 'old' },
  { code: '1chronicles', name: '역대상', abbr: '대상', chapters: 29, testament: 'old' },
  { code: '2chronicles', name: '역대하', abbr: '대하', chapters: 36, testament: 'old' },
  { code: 'ezra', name: '에스라', abbr: '스', chapters: 10, testament: 'old' },
  { code: 'nehemiah', name: '느헤미야', abbr: '느', chapters: 13, testament: 'old' },
  { code: 'esther', name: '에스더', abbr: '에', chapters: 10, testament: 'old' },
  { code: 'job', name: '욥기', abbr: '욥', chapters: 42, testament: 'old' },
  { code: 'psalms', name: '시편', abbr: '시', chapters: 150, testament: 'old' },
  { code: 'proverbs', name: '잠언', abbr: '잠', chapters: 31, testament: 'old' },
  { code: 'ecclesiastes', name: '전도서', abbr: '전', chapters: 12, testament: 'old' },
  { code: 'song', name: '아가', abbr: '아', chapters: 8, testament: 'old' },
  { code: 'isaiah', name: '이사야', abbr: '사', chapters: 66, testament: 'old' },
  { code: 'jeremiah', name: '예레미야', abbr: '렘', chapters: 52, testament: 'old' },
  { code: 'lamentations', name: '예레미야애가', abbr: '애', chapters: 5, testament: 'old' },
  { code: 'ezekiel', name: '에스겔', abbr: '겔', chapters: 48, testament: 'old' },
  { code: 'daniel', name: '다니엘', abbr: '단', chapters: 12, testament: 'old' },
  { code: 'hosea', name: '호세아', abbr: '호', chapters: 14, testament: 'old' },
  { code: 'joel', name: '요엘', abbr: '욜', chapters: 3, testament: 'old' },
  { code: 'amos', name: '아모스', abbr: '암', chapters: 9, testament: 'old' },
  { code: 'obadiah', name: '오바댜', abbr: '옵', chapters: 1, testament: 'old' },
  { code: 'jonah', name: '요나', abbr: '욘', chapters: 4, testament: 'old' },
  { code: 'micah', name: '미가', abbr: '미', chapters: 7, testament: 'old' },
  { code: 'nahum', name: '나훔', abbr: '나', chapters: 3, testament: 'old' },
  { code: 'habakkuk', name: '하박국', abbr: '합', chapters: 3, testament: 'old' },
  { code: 'zephaniah', name: '스바냐', abbr: '습', chapters: 3, testament: 'old' },
  { code: 'haggai', name: '학개', abbr: '학', chapters: 2, testament: 'old' },
  { code: 'zechariah', name: '스가랴', abbr: '슥', chapters: 14, testament: 'old' },
  { code: 'malachi', name: '말라기', abbr: '말', chapters: 4, testament: 'old' },
  { code: 'matthew', name: '마태복음', abbr: '마', chapters: 28, testament: 'new' },
  { code: 'mark', name: '마가복음', abbr: '막', chapters: 16, testament: 'new' },
  { code: 'luke', name: '누가복음', abbr: '눅', chapters: 24, testament: 'new' },
  { code: 'john', name: '요한복음', abbr: '요', chapters: 21, testament: 'new' },
  { code: 'acts', name: '사도행전', abbr: '행', chapters: 28, testament: 'new' },
  { code: 'romans', name: '로마서', abbr: '롬', chapters: 16, testament: 'new' },
  { code: '1corinthians', name: '고린도전서', abbr: '고전', chapters: 16, testament: 'new' },
  { code: '2corinthians', name: '고린도후서', abbr: '고후', chapters: 13, testament: 'new' },
  { code: 'galatians', name: '갈라디아서', abbr: '갈', chapters: 6, testament: 'new' },
  { code: 'ephesians', name: '에베소서', abbr: '엡', chapters: 6, testament: 'new' },
  { code: 'philippians', name: '빌립보서', abbr: '빌', chapters: 4, testament: 'new' },
  { code: 'colossians', name: '골로새서', abbr: '골', chapters: 4, testament: 'new' },
  { code: '1thessalonians', name: '데살로니가전서', abbr: '살전', chapters: 5, testament: 'new' },
  { code: '2thessalonians', name: '데살로니가후서', abbr: '살후', chapters: 3, testament: 'new' },
  { code: '1timothy', name: '디모데전서', abbr: '딤전', chapters: 6, testament: 'new' },
  { code: '2timothy', name: '디모데후서', abbr: '딤후', chapters: 4, testament: 'new' },
  { code: 'titus', name: '디도서', abbr: '딛', chapters: 3, testament: 'new' },
  { code: 'philemon', name: '빌레몬서', abbr: '몬', chapters: 1, testament: 'new' },
  { code: 'hebrews', name: '히브리서', abbr: '히', chapters: 13, testament: 'new' },
  { code: 'james', name: '야고보서', abbr: '약', chapters: 5, testament: 'new' },
  { code: '1peter', name: '베드로전서', abbr: '벧전', chapters: 5, testament: 'new' },
  { code: '2peter', name: '베드로후서', abbr: '벧후', chapters: 3, testament: 'new' },
  { code: '1john', name: '요한일서', abbr: '요일', chapters: 5, testament: 'new' },
  { code: '2john', name: '요한이서', abbr: '요이', chapters: 1, testament: 'new' },
  { code: '3john', name: '요한삼서', abbr: '요삼', chapters: 1, testament: 'new' },
  { code: 'jude', name: '유다서', abbr: '유', chapters: 1, testament: 'new' },
  { code: 'revelation', name: '요한계시록', abbr: '계', chapters: 22, testament: 'new' },
];

export const TOTAL_CHAPTERS = BIBLE_BOOKS.reduce((sum, b) => sum + b.chapters, 0); // 1189

const BOOK_BY_CODE: Record<string, BibleBook> = Object.fromEntries(
  BIBLE_BOOKS.map((b) => [b.code, b])
);

export function getBook(code: string): BibleBook | undefined {
  return BOOK_BY_CODE[code];
}

export function getVersion(key: string): BibleVersionInfo {
  return BIBLE_VERSIONS.find((v) => v.key === key) || BIBLE_VERSIONS[0];
}

// 한글/축약/영문 이름 → 책 코드 매핑 (레퍼런스 검색용)
const NAME_TO_CODE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const b of BIBLE_BOOKS) {
    map[b.name] = b.code;
    map[b.abbr] = b.code;
    map[b.code] = b.code;
    // 흔한 별칭
    map[b.name.replace(/서$/, '')] = b.code;
  }
  // 자주 쓰는 축약 별칭 추가
  const aliases: Record<string, string> = {
    창세: 'genesis', 출애굽: 'exodus', 레위: 'leviticus', 민수: 'numbers', 신명: 'deuteronomy',
    시: 'psalms', 시편: 'psalms', 잠: 'proverbs', 아가서: 'song',
    마태: 'matthew', 마가: 'mark', 누가: 'luke', 요한: 'john', 사도행전: 'acts',
    로마: 'romans', 계시록: 'revelation', 요한계시록: 'revelation',
  };
  Object.assign(map, aliases);
  return map;
})();

export interface BibleReference {
  book: string;       // 책 코드
  chapter: number;
  verse?: number;
  endVerse?: number;
}

// "요한복음 3:16", "요 3:16-18", "창세기 1장", "john 3:16" 등 파싱
export function parseReference(input: string): BibleReference | null {
  const raw = input.trim();
  if (!raw) return null;

  // 책 이름 부분과 장:절 부분 분리
  const m = raw.match(/^([1-3]?\s*[가-힣A-Za-z]+)\s*(\d+)?\s*(?:장|:)?\s*(\d+)?\s*(?:[-~]\s*(\d+))?/);
  if (!m) return null;

  const bookRaw = m[1].replace(/\s+/g, '');
  const code = NAME_TO_CODE[bookRaw];
  if (!code) return null;

  const chapter = m[2] ? parseInt(m[2], 10) : 1;
  const verse = m[3] ? parseInt(m[3], 10) : undefined;
  const endVerse = m[4] ? parseInt(m[4], 10) : undefined;

  const book = getBook(code);
  if (!book) return null;
  if (chapter < 1 || chapter > book.chapters) return null;

  return { book: code, chapter, verse, endVerse };
}

// 표시용 레퍼런스 문자열 (예: 요한복음 3:16-18)
export function formatReference(book: string, chapter: number, verse?: number, endVerse?: number): string {
  const b = getBook(book);
  const name = b?.name || book;
  if (!verse) return `${name} ${chapter}장`;
  if (endVerse && endVerse !== verse) return `${name} ${chapter}:${verse}-${endVerse}`;
  return `${name} ${chapter}:${verse}`;
}

export interface BibleVerse {
  verse: number;
  text: string;
}
