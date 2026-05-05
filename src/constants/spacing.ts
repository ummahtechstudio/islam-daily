// ─── Spacing System ───────────────────────────────────────────────────────────
// Use these tokens instead of arbitrary padding/margin values.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const sectionPadding = {
  vertical: spacing.xl,
  horizontal: spacing.lg,
} as const;

export const cardPadding = {
  vertical: spacing.lg,
  horizontal: spacing.lg,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
