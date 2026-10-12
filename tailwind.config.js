/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#090A0F',
          800: '#12151F',
          700: '#1A1E2C',
          600: '#262C3F',
          500: '#343B52',
        },
        brand: {
          focus: '#3B82F6', // Blue for Focus
          body: '#10B981',  // Emerald for Body
          voice: '#F59E0B', // Amber for Voice
          accent: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'system-ui', 'sans-serif'],
      },
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
