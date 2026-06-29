export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: '#F46C6F',
        secondary: '#FFEE7F',
        cream: '#FDFAD1',
        accent: '#FEB95C',
        soft: '#F1B8AE',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        food: '0 12px 28px rgba(244, 108, 111, 0.16)',
        soft: '0 8px 20px rgba(46, 32, 30, 0.08)',
      },
    },
  },

  plugins: [],
}
