/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
        },
        accent: {
          DEFAULT: '#2563EB',
        },
        error: {
          DEFAULT: '#EF4444',
        },
        bg: {
          dark: 'var(--bg-dark-color)',
          card: 'var(--bg-card)',
          cardSec: 'var(--bg-card-sec)',
        },
        text: {
          primary: 'var(--text-primary-color)',
          secondary: 'var(--text-secondary-color)',
          muted: 'var(--text-muted-color)',
        },
        glass: {
          subtle: 'var(--bg-glass-subtle)',
          subtleHover: 'var(--bg-glass-subtle-hover)',
        },
      },
      boxShadow: {
        'luxury': 'var(--shadow-luxury)',
        'luxury-hover': 'var(--shadow-luxury-hover)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      borderColor: {
        glass: 'var(--border-glass-color)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-slow': 'glow 4s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { opacity: 0.3, transform: 'scale(1)' },
          '100%': { opacity: 0.6, transform: 'scale(1.05)' },
        }
      },
    },
  },
  plugins: [],
}
