// ─── Font name constants ──────────────────────────────────────────────────────

const URDU_FONT = 'NotoNastaliqUrdu_400Regular';
const INDOPAK_FONT = 'IndoPakNastaleeq';

export const Fonts = {
  arabic: 'Amiri_400Regular',
  arabicBold: 'Amiri_700Bold',
  arabicItalic: 'Amiri_400Regular_Italic',
  urdu: URDU_FONT,
  indopak: INDOPAK_FONT,

  // System fonts
  regular: undefined,
  medium: undefined,
  bold: undefined,
};

// FONTS alias for screens that import it this way
export const FONTS = {
  urdu: URDU_FONT,
  arabic: 'Amiri_400Regular',
  indopak: INDOPAK_FONT,
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

// ─── Urdu UI-label helper ─────────────────────────────────────────────────────
// Lighter than `urduStyle` — for short interface labels/buttons (not body copy).
// Applies the Nastaliq face, right-alignment and RTL so the Urdu text itself
// reads correctly while the surrounding layout stays left-to-right. Pass the
// label's existing fontSize so the line height scales with it.

export function urduUiStyle(fontSize: number = 15): {
  fontFamily: string;
  lineHeight: number;
  textAlign: 'right';
  writingDirection: 'rtl';
} {
  return {
    fontFamily: URDU_FONT,
    lineHeight: Math.round(fontSize * 1.9),
    textAlign: 'right',
    writingDirection: 'rtl',
  };
}

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
