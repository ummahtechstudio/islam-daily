// ─── Font name constants ──────────────────────────────────────────────────────

const URDU_FONT = 'NotoNastaliqUrdu_400Regular';

export const Fonts = {
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
  arabicItalic: 'Amiri_400Regular_Italic',
  urdu: URDU_FONT,

  // System fonts
  regular: undefined,
  medium: undefined,
  bold: undefined,
};

// FONTS alias for screens that import it this way
export const FONTS = {
  urdu: URDU_FONT,
  arabic: 'Amiri_400Regular',
  sans: undefined as string | undefined,
};

// ─── Urdu style helper ────────────────────────────────────────────────────────
// Nastaliq script needs ~2.2× line height for descenders/ascenders to not clip.

export function urduStyle(fontSize: number): {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textAlign: 'right';
  writingDirection: 'rtl';
} {
  return {
    fontFamily: URDU_FONT,
    fontSize,
    lineHeight: Math.round(fontSize * 2.2),
    textAlign: 'right',
    writingDirection: 'rtl',
  };
}

export const UrduTextStyle = urduStyle(18);

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,

  arabicSm: 18,
  arabicBase: 22,
  arabicLg: 26,
  arabicXl: 32,
  arabicVerse: 28,
};

export const LineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8,
  arabic: 2.2,
};
