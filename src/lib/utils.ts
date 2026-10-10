import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskPhone(phone: string | null): string {
  if (!phone) return '번호 없음';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***-****-${digits.slice(-4)}`;
}

/** 빠른 년생은 실제 생일을 유지하고 또래 표시 연도만 1년 낮춘다. */
export function birthYearTag(birthDate?: string | null, isEarlyBirth = false): string {
  if (!birthDate || birthDate.length < 4) return '';
  const year = Number(birthDate.substring(0, 4));
  if (!Number.isInteger(year) || year < 1) return '';
  const peerYear = year - (isEarlyBirth ? 1 : 0);
  return ` (${String(peerYear % 100).padStart(2, '0')})`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
