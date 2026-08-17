// 테마 정의 — id 는 <html data-theme="..."> 및 저장 값과 1:1 대응됩니다.
// swatch: 미리보기용 대표 색(강조/표면/배경).

export type ThemeId =
  | 'green'
  | 'light'
  | 'dark'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'cherry'
  | 'royal'
  | 'midnight'
  | 'amoled'
  | 'retro';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  group: 'light' | 'dark';
  // 미리보기 색상 (배경, 표면, 강조)
  swatch: { bg: string; surface: string; accent: string };
}

export const DEFAULT_THEME: ThemeId = 'green';

export const THEMES: ThemeDef[] = [
  { id: 'green', label: '세움 그린', group: 'light', swatch: { bg: '#faf8f3', surface: '#fefdfb', accent: '#4a7d57' } },
  { id: 'light', label: '라이트', group: 'light', swatch: { bg: '#f9fafb', surface: '#ffffff', accent: '#3b82f6' } },
  { id: 'ocean', label: '오션 블루', group: 'light', swatch: { bg: '#f0f9ff', surface: '#ffffff', accent: '#0891b2' } },
  { id: 'forest', label: '포레스트 그린', group: 'light', swatch: { bg: '#f0f9f4', surface: '#ffffff', accent: '#059669' } },
  { id: 'sunset', label: '선셋 오렌지', group: 'light', swatch: { bg: '#fff8f0', surface: '#ffffff', accent: '#ea580c' } },
  { id: 'cherry', label: '체리 레드', group: 'light', swatch: { bg: '#fff5f5', surface: '#ffffff', accent: '#dc2626' } },
  { id: 'royal', label: '로얄 퍼플', group: 'light', swatch: { bg: '#f9f7ff', surface: '#ffffff', accent: '#7c3aed' } },
  { id: 'retro', label: '레트로', group: 'light', swatch: { bg: '#ede3cd', surface: '#f5eedf', accent: '#9b481e' } },
  { id: 'dark', label: '다크', group: 'dark', swatch: { bg: '#18181b', surface: '#202024', accent: '#7cc298' } },
  { id: 'midnight', label: '미드나잇', group: 'dark', swatch: { bg: '#0f172a', surface: '#1e293b', accent: '#82b4f5' } },
  { id: 'amoled', label: 'AMOLED 블랙', group: 'dark', swatch: { bg: '#000000', surface: '#0c0c0c', accent: '#3ee09e' } },
];

const VALID = new Set<string>(THEMES.map((t) => t.id));

export function isValidTheme(value: unknown): value is ThemeId {
  return typeof value === 'string' && VALID.has(value);
}

export const THEME_STORAGE_KEY = 'seum-theme';
