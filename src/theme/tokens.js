/**
 * Design Tokens - Centralized Color System
 * WCAG AA Compliant Color Palette for Fortis Secured Portal
 * 
 * Contrast Ratios:
 * - Normal text: 4.5:1 minimum (AA)
 * - Large text: 3:1 minimum (AA)
 * - UI components: 3:1 minimum (AA)
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    DEFAULT: '#0B3D91',
    light: '#1A5BC4',
    dark: '#072B68',
    50: '#E6F0FF',
    100: '#CCE0FF',
    200: '#99C2FF',
    300: '#66A3FF',
    400: '#3385FF',
    500: '#0B3D91',
    600: '#083174',
    700: '#062557',
    800: '#04193A',
    900: '#020D1D',
  },

  // Accent/Action Color (Cyan)
  accent: {
    DEFAULT: '#14D4D4', // Increased brightness for better contrast
    light: '#40E0E0',
    dark: '#0BA8A8',
    50: '#E6FEFE',
    100: '#CCFDFD',
    200: '#99FBFB',
    300: '#66F9F9',
    400: '#33F6F6',
    500: '#14D4D4',
    600: '#10AAAA',
    700: '#0C7F7F',
    800: '#085555',
    900: '#042A2A',
  },

  // Background Colors
  background: {
    primary: '#0B1220', // night-sky
    secondary: '#151E30', // Lighter background for cards (improved contrast)
    tertiary: '#1F2937', // Even lighter for elevated elements
    overlay: 'rgba(11, 18, 32, 0.85)', // Dark overlay
    glass: 'rgba(255, 255, 255, 0.06)', // Increased from 0.05 for better visibility
    'glass-hover': 'rgba(255, 255, 255, 0.10)',
  },

  // Text Colors (WCAG AA compliant on dark backgrounds)
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.85)', // Increased from 0.70
    muted: 'rgba(255, 255, 255, 0.60)', // Increased from 0.50
    disabled: 'rgba(255, 255, 255, 0.45)', // Increased from 0.40
    placeholder: 'rgba(255, 255, 255, 0.40)',
  },

  // Border Colors
  border: {
    primary: 'rgba(255, 255, 255, 0.15)', // Increased from 0.10
    secondary: 'rgba(255, 255, 255, 0.08)',
    focus: '#14D4D4',
    error: '#EF4444',
  },

  // Status Colors (WCAG AA compliant)
  status: {
    success: {
      DEFAULT: '#10B981', // Green
      light: '#34D399',
      dark: '#059669',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.30)',
    },
    warning: {
      DEFAULT: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.30)',
    },
    error: {
      DEFAULT: '#EF4444', // Red
      light: '#F87171',
      dark: '#DC2626',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.30)',
    },
    info: {
      DEFAULT: '#3B82F6', // Blue
      light: '#60A5FA',
      dark: '#2563EB',
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.30)',
    },
  },

  // UI Component Colors
  components: {
    input: {
      bg: 'rgba(255, 255, 255, 0.06)', // Increased from 0.05
      bgHover: 'rgba(255, 255, 255, 0.08)',
      bgFocus: 'rgba(255, 255, 255, 0.10)',
      bgDisabled: 'rgba(255, 255, 255, 0.03)',
      border: 'rgba(255, 255, 255, 0.15)', // Increased from 0.10
      borderFocus: '#14D4D4',
      text: '#FFFFFF',
      textDisabled: 'rgba(255, 255, 255, 0.45)',
    },
    button: {
      primary: {
        bg: '#14D4D4',
        bgHover: '#10AAAA',
        bgActive: '#0C7F7F',
        bgDisabled: 'rgba(20, 212, 212, 0.30)',
        text: '#0B1220',
        textDisabled: 'rgba(11, 18, 32, 0.50)',
      },
      secondary: {
        bg: 'rgba(255, 255, 255, 0.10)',
        bgHover: 'rgba(255, 255, 255, 0.15)',
        bgActive: 'rgba(255, 255, 255, 0.20)',
        bgDisabled: 'rgba(255, 255, 255, 0.05)',
        text: '#FFFFFF',
        textDisabled: 'rgba(255, 255, 255, 0.45)',
      },
    },
    card: {
      bg: 'rgba(255, 255, 255, 0.06)', // Increased from 0.05
      bgHover: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.15)', // Increased from 0.10
    },
  },
};

// Semantic color mappings
export const semanticColors = {
  // Backgrounds
  bgPrimary: colors.background.primary,
  bgSecondary: colors.background.secondary,
  bgTertiary: colors.background.tertiary,
  
  // Text
  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  textMuted: colors.text.muted,
  textDisabled: colors.text.disabled,
  
  // Borders
  borderPrimary: colors.border.primary,
  borderSecondary: colors.border.secondary,
  
  // Interactive
  interactive: colors.accent.DEFAULT,
  interactiveHover: colors.accent.light,
  interactiveActive: colors.accent.dark,
  interactiveDisabled: 'rgba(20, 212, 212, 0.30)',
};

// Spacing scale (8px base)
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};

// Typography scale
export const typography = {
  fontFamily: {
    sans: ['Manrope', 'system-ui', 'sans-serif'],
    mono: ['Monaco', 'Courier New', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Border radius scale
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  full: '9999px',
};

// Shadow definitions
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  glass: '0 8px 32px rgba(11, 18, 32, 0.35)',
};

// Animation durations
export const transitions = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
};

export default {
  colors,
  semanticColors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
};
