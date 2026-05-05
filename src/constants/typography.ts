import type { TextStyle } from 'react-native';

// ─── Typography Hierarchy ─────────────────────────────────────────────────────
// Used across all utility surfaces. Sacred surfaces (Mushaf, manuscript cards)
// have their own bespoke typography in MUSHAF_* tokens / ManuscriptCard.

export const typography = {
  display: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  heading1: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.3,
  } satisfies TextStyle,

  heading2: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  } satisfies TextStyle,

  heading3: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  } satisfies TextStyle,

  bodyLarge: { fontSize: 17, fontWeight: '400', lineHeight: 24 } satisfies TextStyle,
  body:      { fontSize: 15, fontWeight: '400', lineHeight: 22 } satisfies TextStyle,
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18 } satisfies TextStyle,

  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  // Arabic — paired with Latin (NOT for Mushaf)
  arabicDisplay: {
    fontFamily: 'IndoPakNastaleeq',
    fontSize: 28,
    lineHeight: 50,
    writingDirection: 'rtl',
  } satisfies TextStyle,

  arabicBody: {
    fontFamily: 'IndoPakNastaleeq',
    fontSize: 22,
    lineHeight: 42,
    writingDirection: 'rtl',
  } satisfies TextStyle,

  // Urdu translations
  urduBody: {
    fontFamily: 'NotoNastaliqUrdu_400Regular',
    fontSize: 18,
    lineHeight: 36,
    writingDirection: 'rtl',
  } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
