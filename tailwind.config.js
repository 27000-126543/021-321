/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          900: '#1A2F23',
          800: '#243B2E',
          700: '#2E4A3A',
          600: '#3D5F4C',
          500: '#4A7A5E',
        },
        parchment: {
          50: '#FDFBF7',
          100: '#F5F0E8',
          200: '#EDE5D8',
          300: '#DDD2BF',
        },
        amber: {
          accent: '#E8913A',
          light: '#F5B06A',
          dark: '#C67820',
        },
        status: {
          normal: '#5CB85C',
          discontinued: '#E85D4A',
          burst: '#F0B429',
          pending: '#4A90D9',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
