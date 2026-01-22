import { colors, spacing, typography, borderRadius, shadows } from './src/theme/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        // Legacy color mappings for backwards compatibility
        primary: colors.primary.DEFAULT,
        'primary-dark': colors.primary.dark,
        accent: colors.accent.DEFAULT,
        'night-sky': colors.background.primary,

        // CSS variable-driven tokens (accessible dark theme)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-2': 'rgb(var(--bg-2) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',

        text: 'rgb(var(--text) / <alpha-value>)',
        'text-2': 'rgb(var(--text-2) / <alpha-value>)',
        'text-3': 'rgb(var(--text-3) / <alpha-value>)',
        'text-disabled': 'rgb(var(--text-disabled) / <alpha-value>)',

        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-dark': 'rgb(var(--brand-dark) / <alpha-value>)',
        'brand-foreground': 'rgb(var(--brand-foreground) / <alpha-value>)',

        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
      },
      spacing,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      borderRadius: {
        ...borderRadius,
        xl: '14px',
        '2xl': '18px',
      },
      fontFamily: typography.fontFamily,
      boxShadow: {
        ...shadows,
        glass: shadows.glass,
        card: '0 10px 30px rgba(0,0,0,0.25)',
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out 2s infinite',
        'float-slow': 'float 10s ease-in-out 1s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(10px, -10px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
