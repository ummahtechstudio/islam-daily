/**
 * Single source of truth for Quran ayah data.
 *
 * As of Phase O.2-bundle the entire 6,236-ayah Tanzil / Indo-Pak dataset is
 * bundled inside the APK at `assets/data/quran.json`. There is no runtime
 * download, no Supabase call, no first-launch banner — the data is available
 * the moment the JS bundle loads.
 *
 * Public API (`getAyahsForPage`, `getAyahsForSurah`, `isQuranCached`) is
 * preserved so callers like `MushafPageItem` and `useQuran` don't change.
 */

import { SURAH_META } from '../constants/surahMeta';

export const EXPECTED_AYAH_COUNT = 6236;

export type AyahLite = {
  surah: number;
  ayah: number;
  text_indopak: string;
  text_arabic?: string;
  translation_ur?: string;
  translation_en?: string;
  page_indopak: number;
};

export type QuranIndex = {
  byPage: Record<number, AyahLite[]>;
  bySurah: Record<number, AyahLite[]>;
  totalAyahs: number;
};

// Compact row shape produced by scripts/export-quran.ts. Short keys keep the
// bundled JSON ~25% smaller than verbose field names.
type BundledAyah = {
  s: number;   // surah_number
  a: number;   // ayah_number
  p: number;   // page_indopak
  ti: string;  // text_indopak
  ta: string;  // arabic_text (Tanzil Uthmani)
  tu: string;  // translation_ur
  te: string;  // translation_en
};

// Lazy-required so we don't pay JSON.parse cost on cold start until the
// Quran is actually opened. After the first call the index is memoized for
// the rest of the app session.
let memoIndex: QuranIndex | null = null;

function buildIndex(): QuranIndex {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const raw = require('../../assets/data/quran.json') as BundledAyah[];

  const byPage: Record<number, AyahLite[]> = {};
  const bySurah: Record<number, AyahLite[]> = {};

  for (const r of raw) {
    const ayah: AyahLite = {
      surah: r.s,
      ayah: r.a,
      page_indopak: r.p,
      text_indopak: r.ti,
      text_arabic: r.ta || undefined,
      translation_ur: r.tu || undefined,
      translation_en: r.te || undefined,
    };
    (byPage[ayah.page_indopak] ??= []).push(ayah);
    (bySurah[ayah.surah] ??= []).push(ayah);
  }

  return {
    byPage,
    bySurah,
    totalAyahs: raw.length,
  };
}

function getIndex(): QuranIndex {
  if (memoIndex) return memoIndex;
  memoIndex = buildIndex();
  return memoIndex;
}

export function getQuranFromCache(): QuranIndex | null {
  // Always available — kept returning a (now never-null) value so callers
  // that branched on null still type-check.
  return getIndex();
}

export function getAyahsForPage(pageNumber: number): AyahLite[] {
  return getIndex().byPage[pageNumber] ?? [];
}

export function getAyahsForSurah(surahNumber: number): AyahLite[] {
  return getIndex().bySurah[surahNumber] ?? [];
}

export function isQuranCached(): boolean {
  // True from process start — the data ships with the app.
  return true;
}

export function clearQuranCache(): void {
  // No-op: there is nothing to clear. The bundled JSON is part of the APK,
  // not user storage. Kept exported so existing call sites compile.
  memoIndex = null;
}

// ── Stats / debugging helpers ────────────────────────────────────────────────

/** Number of distinct pages with at least one ayah. Should be 604. */
export function pageCount(): number {
  return Object.keys(getIndex().byPage).length;
}

// Defensive runtime sanity check — surface a console warning if the bundled
// asset is ever out of sync with SURAH_META at app start. Cheap; runs once.
let didSanityCheck = false;
function sanityCheck() {
  if (didSanityCheck) return;
  didSanityCheck = true;
  const idx = getIndex();
  if (idx.totalAyahs !== EXPECTED_AYAH_COUNT) {
    console.warn(
      `[quranCache] bundled Quran has ${idx.totalAyahs} ayahs, expected ${EXPECTED_AYAH_COUNT}`,
    );
  }
  for (const m of SURAH_META) {
    const got = idx.bySurah[m.number]?.length ?? 0;
    if (got !== m.ayah_count) {
      console.warn(
        `[quranCache] surah ${m.number} has ${got} ayahs, expected ${m.ayah_count}`,
      );
    }
  }
}

// Run the sanity check after the module is required, but defer one tick so
// it doesn't slow the first paint.
setTimeout(sanityCheck, 0);
