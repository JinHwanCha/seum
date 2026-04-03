import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f1f6f2',
          100: '#dde9df',
          200: '#bdd5c2',
          300: '#93bd9c',
          400: '#679d74',
          500: '#4a7d57',
          600: '#3b6648',
          700: '#30533a',
          800: '#2a4430',
          900: '#233928',
          950: '#122015',
        },
        accent: {
          50: '#fdf8ef',
          100: '#f9ecd5',
          200: '#f2d6aa',
          300: '#eabc74',
          400: '#e3a148',
          500: '#db8a2c',
          600: '#c46e20',
          700: '#a3531d',
          800: '#85421e',
          900: '#6d371b',
          950: '#3b1b0c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
