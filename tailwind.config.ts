import type { Config } from 'tailwindcss';

// 색상은 CSS 변수(RGB 채널)로 정의되어 테마 전환 시 실시간으로 반영됩니다.
// 실제 값은 globals.css 의 :root / [data-theme] 블록에서 관리합니다.
const rgb = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const scale = (prefix: string) => ({
  50: rgb(`${prefix}-50`),
  100: rgb(`${prefix}-100`),
  200: rgb(`${prefix}-200`),
  300: rgb(`${prefix}-300`),
  400: rgb(`${prefix}-400`),
  500: rgb(`${prefix}-500`),
  600: rgb(`${prefix}-600`),
  700: rgb(`${prefix}-700`),
  800: rgb(`${prefix}-800`),
  900: rgb(`${prefix}-900`),
  950: rgb(`${prefix}-950`),
});

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        white: rgb('--c-white'),
        page: rgb('--c-page'),
        surface: rgb('--c-surface'),
        primary: scale('--c-primary'),
        accent: scale('--c-accent'),
        // 중립 색(neutral) — 다크 테마에서 반전됩니다.
        stone: scale('--c-stone'),
        gray: scale('--c-stone'),
        neutral: scale('--c-stone'),
      },
    },
  },
  plugins: [],
};

export default config;
