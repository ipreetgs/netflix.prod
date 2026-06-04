/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E50914',
          hover: '#C11119',
        },
        netflix: {
          black: '#080808',
          dark: '#141414',
          card: '#181818',
          cardHover: '#2f2f2f',
          textMuted: '#A3A3A3',
        }
      },
      fontFamily: {
        primary: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
