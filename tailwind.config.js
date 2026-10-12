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
          950: '#000000',
          900: '#000000',
          800: '#1C1C1E',
          700: '#2C2C2E',
          600: '#3A3A3C',
          500: '#48484A',
        },
        ios: {
          blue: '#0A84FF',
          green: '#30D158',
          orange: '#FF9F0A',
          red: '#FF453A',
          purple: '#BF5AF2',
          cyan: '#64D2FF',
          yellow: '#FFD60A',
          gray: '#8E8E93',
          card: '#1C1C1E',
          subcard: '#2C2C2E',
          elevated: '#3A3A3C'
        },
        brand: {
          focus: '#0A84FF',
          body: '#30D158',
          voice: '#FF9F0A',
          ticket: '#BF5AF2',
          recovery: '#64D2FF'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'system-ui', 'sans-serif'],
      },
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      spacing: {
        '13': '3.25rem', // 52px
        '15': '3.75rem', // 60px
        '18': '4.5rem',  // 72px
      },
    },
  },
  plugins: [],
}
