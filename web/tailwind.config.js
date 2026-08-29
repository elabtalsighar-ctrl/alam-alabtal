/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        sun: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        },
        berry: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626'
        },
        mint: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669'
        }
      },
      fontFamily: {
        sans: ['Tajawal', 'Segoe UI', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(31, 41, 55, 0.08)',
        card: '0 8px 30px rgba(37, 99, 235, 0.08)'
      },
      borderRadius: {
        xl2: '1.25rem'
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        }
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
