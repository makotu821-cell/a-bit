/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Noto Sans JP"', 'sans-serif'],
      },
      colors: {
        bg: '#0b0a14',
        surface: '#14121f',
        surface2: '#1c1a2b',
        border: '#2a2740',
        muted: '#8b88a3',
        primary: { DEFAULT: '#8b5cf6', fg: '#ffffff', soft: '#8b5cf622' },
        accent: { DEFAULT: '#22d3ee', soft: '#22d3ee22' },
      },
    },
  },
  plugins: [],
}
