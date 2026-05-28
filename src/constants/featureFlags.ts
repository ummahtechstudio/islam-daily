/**
 * V1 launch feature flags.
 *
 * Two sections are coming back properly in v1.1 — for v1 we hide their
 * navigation entries but keep the underlying screens and code intact.
 *
 * To re-enable for v1.1: flip the relevant flag to true. All gates use
 * `FEATURES.X` (no compile-time stripping), so the screens stay in the
 * bundle and a single import change brings them back.
 */

export const FEATURES = {
  /**
   * Islamic Books library. Hidden in v1 because the dataset is still
   * "Coming Soon" — every entry has `available !== true`. Coming back
   * properly in v1.1 with PDFs hosted on R2.
   */
  islamicBooks: false,

  /**
   * Adhkar / Dhikr audio library. NOT to be confused with the Quran audio
   * recitation in the Quran tab (which IS shipping in v1). Hidden because
   * 41 of 50 items are `enabled: false` and 6 of 7 categories are empty.
   * Coming back in v1.1 once the audio is curated.
   */
  audioLibrary: false,
} as const;

/**
 * Route paths that are hidden in this release. Used by the redirect guard
 * so a stale deep link or pasted URL lands on Home instead of an empty
 * screen.
 */
export const V1_HIDDEN_ROUTES: readonly string[] = [
  ...(FEATURES.islamicBooks ? [] : ['/islamic-books']),
  ...(FEATURES.audioLibrary ? [] : ['/audio-library']),
];

export function isRouteHidden(path: string): boolean {
  return V1_HIDDEN_ROUTES.includes(path);
}
