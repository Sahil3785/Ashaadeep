/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./appshell/index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Half-step sizes used for icons, plus the 13 and 400/600 steps the
      // layouts rely on. Tailwind's default scale omits these.
      spacing: { '4.5': '1.125rem', '5.5': '1.375rem', '6.5': '1.625rem', '13': '3.25rem' },
      transitionDuration: { '400': '400ms', '600': '600ms' },
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, String(i / 100)])),
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        // School identity: deep academic navy + warm brass + garden green
        ink: {
          50: '#f4f6fb', 100: '#e7ebf6', 200: '#cbd4e9', 300: '#9fb0d4',
          400: '#6c84ba', 500: '#4a63a1', 600: '#394d85', 700: '#2f3f6c',
          800: '#2a375b', 900: '#18213c', 950: '#0d1223',
          // Named text roles used across the pages.
          soft: '#4a5578', faint: '#8792b0',
        },
        brass: {
          50: '#fffaeb', 100: '#fef0c7', 200: '#fde088', 300: '#fcca49',
          400: '#fbb420', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        garden: {
          50: '#edfcf4', 100: '#d4f7e3', 200: '#aceecb', 300: '#75dfac',
          400: '#3dc888', 500: '#19ae6d', 600: '#0d8c58', 700: '#0b7049',
          800: '#0c593c', 900: '#0b4933',
        },
        parchment: {
          50: '#fdfcfa', 100: '#faf7f2', 200: '#f4efe6', 300: '#ebe3d4',
          400: '#ddd1bb', 500: '#c9b795',
        },
        // Two extra accents so a grid of six cards is not six identical navy
        // squares. Both are desaturated to sit calmly on the warm paper ground
        // rather than fighting the brass.
        sky: {
          50: '#eff5ff', 100: '#dce8fd', 200: '#c1d6fb', 300: '#97b9f7',
          400: '#6693f0', 500: '#426fe2', 600: '#2f53c6', 700: '#2941a0',
          800: '#273a80', 900: '#253566',
        },
        plum: {
          50: '#f9f3fd', 100: '#f2e6fb', 200: '#e6cef6', 300: '#d2abee',
          400: '#b77fe2', 500: '#9d59d2', 600: '#843cb6', 700: '#6d2f94',
          800: '#5b2a79', 900: '#4c2563',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(13,18,35,.04), 0 4px 12px -2px rgba(13,18,35,.06)',
        lift: '0 2px 4px rgba(13,18,35,.04), 0 12px 28px -6px rgba(13,18,35,.12)',
        float: '0 8px 16px rgba(13,18,35,.06), 0 24px 48px -12px rgba(13,18,35,.16)',
        brass: '0 8px 24px -6px rgba(245,158,11,.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.7)',
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        'fade-up': { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        'float-slow': { '0%,100%': { transform: 'translateY(0) scale(1)' }, '50%': { transform: 'translateY(-24px) scale(1.04)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'draw-line': { from: { 'stroke-dashoffset': 1000 }, to: { 'stroke-dashoffset': 0 } },
        'pop-in': { '0%': { opacity: 0, transform: 'scale(.9)' }, '60%': { transform: 'scale(1.02)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        'slide-down': { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'none' } },
        'toast-in': { from: { opacity: 0, transform: 'translateX(24px) scale(.96)' }, to: { opacity: 1, transform: 'none' } },
        'bar-grow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        'ring-pulse': { '0%': { boxShadow: '0 0 0 0 rgba(245,158,11,.5)' }, '70%': { boxShadow: '0 0 0 14px rgba(245,158,11,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(245,158,11,0)' } },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        'fade-up': 'fade-up .6s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .5s ease both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 14s ease-in-out infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
        'pop-in': 'pop-in .45s cubic-bezier(.22,1,.36,1) both',
        'slide-down': 'slide-down .3s ease both',
        'toast-in': 'toast-in .4s cubic-bezier(.22,1,.36,1) both',
        'bar-grow': 'bar-grow 1.1s cubic-bezier(.22,1,.36,1) both',
        'ring-pulse': 'ring-pulse 2.4s ease-out infinite',
      },
      backgroundImage: {
        'grid-ink': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 .5H40M.5 0V40' stroke='%230d1223' stroke-opacity='.05'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
