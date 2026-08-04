import { startOfWeek, format, subWeeks, addWeeks, getWeek, getMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

/** Get the Sunday that starts the current week (weekStartsOn: 0 = Sunday) */
export function getCurrentWeekSunday(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 0 });
}

/** 해당 주(일요일)가 속한 달 안에서의 주차(1~5). formatWeekLabel과 동일 규칙. */
export function getWeekNumberInMonth(sunday: Date): number {
  return Math.ceil(sunday.getDate() / 7);
}

/** 'YYYY-MM' 형태의 월 키 반환 */
export function formatMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

/** 'YYYY년 M월' 형태의 월 라벨 반환 */
export function formatMonthLabel(date: Date): string {
  return `${format(date, 'yyyy', { locale: ko })}년 ${getMonth(date) + 1}월`;
}

export function getPreviousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function getNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function isFutureMonth(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() > now.getFullYear() ||
    (date.getFullYear() === now.getFullYear() && date.getMonth() > now.getMonth())
  );
}

/**
 * 해당 월에 속한 각 주(일요일 기준)의 목록을 반환한다.
 * 주는 일요일의 날짜가 속한 달로 귀속된다(formatWeekLabel 규칙과 동일).
 * 미래 주는 제외한다.
 */
export function getMonthWeeks(date: Date): { weekNum: number; sunday: string }[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const currentSunday = getCurrentWeekSunday();

  const weeks: { weekNum: number; sunday: string }[] = [];
  let d = getCurrentWeekSunday(new Date(year, month, 1));
  if (d.getMonth() !== month) d = addWeeks(d, 1); // 달의 첫 일요일로 이동

  while (d.getMonth() === month && d.getFullYear() === year) {
    if (d <= currentSunday) {
      weeks.push({ weekNum: getWeekNumberInMonth(d), sunday: formatWeekDate(d) });
    }
    d = addWeeks(d, 1);
  }
  return weeks;
}

export function formatWeekLabel(sunday: Date): string {
  const month = getMonth(sunday) + 1;
  const weekNum = Math.ceil(sunday.getDate() / 7);
  return `${format(sunday, 'yyyy', { locale: ko })}년 ${month}월 ${weekNum}주차 (${format(sunday, 'M/d', { locale: ko })})`;
}

export function formatWeekDate(sunday: Date): string {
  return format(sunday, 'yyyy-MM-dd');
}

export function getPreviousWeek(sunday: Date): Date {
  return subWeeks(sunday, 1);
}

export function getNextWeek(sunday: Date): Date {
  return addWeeks(sunday, 1);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'yyyy.MM.dd');
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'yyyy.MM.dd HH:mm');
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return format(d, 'yyyy.MM.dd');
}

export function parseSunday(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export function isFutureWeek(sunday: Date): boolean {
  const now = new Date();
  const currentSunday = getCurrentWeekSunday(now);
  return sunday > currentSunday;
}

/**
 * 한국시간(KST) 기준으로 다가오는(혹은 오늘인) 주일(일요일) 날짜를
 * "yyyy.MM.dd" 형식의 문자열로 반환한다. 브라우저 타임존과 무관하게 동작.
 */
export function getUpcomingSundayLabelKST(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = weekdayMap[get('weekday')] ?? 0;
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));

  // KST 날짜 파트로 UTC 기준 날짜를 만들어 안전하게 일수를 더한다.
  const base = new Date(Date.UTC(year, month - 1, day));
  const addDays = dow === 0 ? 0 : 7 - dow;
  base.setUTCDate(base.getUTCDate() + addDays);

  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}
