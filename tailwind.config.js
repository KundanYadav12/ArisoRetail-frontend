/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        ariso: {
          50: '#f0f6ff',
          100: '#e0edfe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36a8f6',
          500: '#0c8de8',
          600: '#006ec7',
          700: '#0157a0',
          800: '#064a84',
          900: '#0b3e6e',
          950: '#072749',
        },
        surface: {
          base: '#ffffff',
          subtle: '#f8fafc',
          muted: '#f1f5f9',
          border: '#e2e8f0',
        },
        dark: {
          base: '#090d16',
          surface: '#111827',
          muted: '#1f2937',
        }
      },
      animation: {
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
