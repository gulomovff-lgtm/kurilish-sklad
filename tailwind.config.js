/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        nirvana: {
          50:  '#fdf9f7',
          100: '#f7ede7',
          200: '#edd5c8',
          300: '#ddb8a6',
          400: '#c89587',   // primary brand — rose-terracotta
          500: '#b57e6f',
          600: '#a67161',   // deeper
          700: '#7a5040',
          800: '#59301f',   // dark warm brown (body text)
          900: '#3d1a0e',   // darkest
        },
        sidebar: {
          DEFAULT: '#2a1208',
          hover:   '#3d1c0e',
          active:  '#4f2415',
          border:  '#5c2e1a',
          text:    '#e8cfc5',
          muted:   '#a07060',
        },
      },
    },
  },
  plugins: [],
}
