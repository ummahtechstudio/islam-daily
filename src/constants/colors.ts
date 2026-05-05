export const Colors = {
  primary: '#0F6E56',
  primaryDark: '#0A4F3D',
  primaryLight: '#1A8F72',
  accent: '#C9A84C',
  accentLight: '#F0D080',

  // Light theme
  light: {
    background: '#FFFFFF',
    surface: '#F7F9F8',
    card: '#FFFFFF',
    border: '#E8EDE9',
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E8EDE9',
    headerBg: '#0F6E56',
    headerText: '#FFFFFF',
  },

  // Dark theme
  dark: {
    background: '#0D1B16',
    surface: '#172820',
    card: '#1E3328',
    border: '#2A4438',
    text: '#F0FFF8',
    textSecondary: '#9DC5B5',
    textMuted: '#6A9A88',
    tabBar: '#0D1B16',
    tabBarBorder: '#2A4438',
    headerBg: '#0A4F3D',
    headerText: '#FFFFFF',
  },

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export type ColorScheme = 'light' | 'dark';

// ─── Design System Tokens (Phase D.1) ─────────────────────────────────────────
// Use these tokens for all new and refined surfaces. Keeps the visual language
// coherent across the app. The legacy `Colors` export above is preserved so
// existing screens keep working until they are migrated.

export const palette = {
  // Foundation
  green: '#0F6E56',
  greenDark: '#0A4D3D',
  greenLight: '#155F4A',
  greenBg: '#0D2A24',
  greenDeep: '#08231C',

  gold: '#EF9F27',
  goldSoft: '#D9881C',
  goldFaded: 'rgba(239,159,39,0.2)',

  cream: '#FBF6E4',
  creamSoft: '#F4ECCD',
  creamBorder: '#E8DCB1',

  // Text on dark surfaces
  textPrimary: '#F5F0E0',
  textSecondary: 'rgba(245,240,224,0.7)',
  textMuted: 'rgba(245,240,224,0.5)',

  // Text on cream surfaces
  textOnCream: '#1A3D2F',
  textOnCreamSecondary: 'rgba(26,61,47,0.65)',
  textOnCreamMuted: 'rgba(26,61,47,0.45)',

  // System
  divider: 'rgba(245,240,224,0.1)',
  dividerOnCream: 'rgba(26,61,47,0.12)',
  error: '#C24D4D',

  // Sacred surface borders
  goldBorder: '#C8941F',
  goldBorderSubtle: 'rgba(200,148,31,0.4)',
} as const;
