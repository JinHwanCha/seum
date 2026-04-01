import { startOfWeek, format, subWeeks, addWeeks, getWeek, getMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

/** Get the Sunday that starts the current week (weekStartsOn: 0 = Sunday) */
export function getCurrentWeekSunday(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 0 });
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

export function parseSunday(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export function isFutureWeek(sunday: Date): boolean {
  const now = new Date();
  const currentSunday = getCurrentWeekSunday(now);
  return sunday > currentSunday;
}
