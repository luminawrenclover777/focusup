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
          blue: '#007AFF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          purple: '#AF52DE',
          indigo: '#5856D6',
          teal: '#30B0C7',
          yellow: '#FFCC00',
          gray: '#8E8E93',
          card: '#1C1C1E',
          subcard: '#2C2C2E'
        },
        brand: {
          focus: '#007AFF',
          body: '#34C759',
          voice: '#FF9500',
          accent: '#AF52DE'
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
