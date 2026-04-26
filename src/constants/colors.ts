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
