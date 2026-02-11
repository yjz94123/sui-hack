/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'SF Pro Text',
          'SF Pro Display',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        base: 'rgb(var(--color-bg-base) / <alpha-value>)',
        surface: 'rgb(var(--color-bg-surface) / <alpha-value>)',
        elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        overlay: 'rgb(var(--color-bg-overlay) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'border-strong': 'rgb(var(--color-border-strong) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          soft: 'rgb(var(--color-accent-soft) / <alpha-value>)',
        },
        primary: {
          50: '#ecf5ff',
          100: '#d6e9ff',
          200: '#b0d4ff',
          300: '#86bcff',
          400: '#58a2ff',
          500: '#0a84ff',
          600: '#0068d9',
          700: '#0054ae',
          800: '#0a3f7f',
          900: '#112f58',
          950: '#0a1d36',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        fg: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger) / <alpha-value>)',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(17, 24, 39, 0.08)',
        card: '0 1px 0 rgba(255,255,255,0.7) inset, 0 6px 20px rgba(17,24,39,0.05)',
        glass: '0 8px 32px rgba(17, 24, 39, 0.08)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.1rem',
      },
    },
  },
  plugins: [],
};
