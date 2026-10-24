/**
 * Builds alquran.cloud-shaped surah editions from the Quran bundled in the APK
 * (assets/data/quran.json, via quranCache), so every Quran screen works with no
 * network.
 *
 * The bundle carries exactly two translations, and they may only ever be shown
 * under their own names:
 *   - `tu` — Urdu, Fateh Muhammad Jalandhri  → edition `ur.jalandhry`
 *   - `te` — English, Muhammad Asad          → edition `en.asad`
 * Any other edition (Maududi, Saheeh International, Yusuf Ali, …) must come
 * from the network. When it can't, callers fall back to a bundled edition and
 * label it as that edition — never as the one the user picked.
 */
import type { Ayah, SurahEdition, SurahMeta } from './api';
import { AyahLite, getAyahsForSurah } from './quranCache';
import { SURAH_META, SURAH_NAME_MEANINGS } from '../constants/surahMeta';

const BUNDLED_TRANSLATIONS = {
  'ur.jalandhry': { lang: 'ur', name: 'Jalandhri', pick: (a: AyahLite) => a.translation_ur },
  'en.asad': { lang: 'en', name: 'Asad', pick: (a: AyahLite) => a.translation_en },
} as const;

export type BundledEdition = keyof typeof BUNDLED_TRANSLATIONS;

export function isBundledEdition(edition: string): edition is BundledEdition {
  return edition in BUNDLED_TRANSLATIONS;
}

/** The bundled edition to show when `requested` can't be fetched (offline). */
export function bundledFallbackEdition(requested: string): BundledEdition {
  return requested.startsWith('ur.') ? 'ur.jalandhry' : 'en.asad';
}

// Cumulative ayah offsets → global ayah numbers (used by the audio CDN URLs).
export const SURAH_OFFSETS: number[] = (() => {
  const arr: number[] = [];
  let cum = 0;
  for (const m of SURAH_META) {
    arr[m.number] = cum;
    cum += m.ayah_count;
  }
  return arr;
})();

function toAyah(a: AyahLite, text: string, offset: number): Ayah {
  return {
    number: offset + a.ayah,
    text,
    numberInSurah: a.ayah,
    juz: 0,
    manzil: 0,
    page: a.page_indopak,
    ruku: 0,
    hizbQuarter: 0,
    sajda: false,
  };
}

/** Surah list from bundled metadata — same shape as the alquran.cloud list. */
export function bundledSurahList(): SurahMeta[] {
  return SURAH_META.map((m) => ({
    number: m.number,
    name: m.name_arabic,
    englishName: m.name_english,
    englishNameTranslation: SURAH_NAME_MEANINGS[m.number - 1] ?? '',
    numberOfAyahs: m.ayah_count,
    revelationType: m.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
  }));
}

/**
 * Arabic (Tanzil Uthmani) plus — only when `edition` is one of the two bundled
 * translations — that translation. `translation` is null for any other edition.
 */
export function buildBundledSurah(
  surahNumber: number,
  edition: string,
): { arabic: SurahEdition; translation: SurahEdition | null } | null {
  const ayahs = getAyahsForSurah(surahNumber);
  const meta = SURAH_META.find((m) => m.number === surahNumber);
  if (!meta || ayahs.length === 0) return null;
  if (!ayahs.every((a) => a.text_arabic && a.text_arabic.length > 0)) return null;

  const offset = SURAH_OFFSETS[surahNumber] ?? 0;
  const base = {
    number: surahNumber,
    name: meta.name_arabic,
    englishName: meta.name_english,
    englishNameTranslation: SURAH_NAME_MEANINGS[surahNumber - 1] ?? '',
    revelationType: meta.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
    numberOfAyahs: meta.ayah_count,
  };
  const arabic: SurahEdition = {
    ...base,
    ayahs: ayahs.map((a) => toAyah(a, a.text_arabic ?? '', offset)),
    edition: { identifier: 'quran-uthmani', language: 'ar', name: 'Tanzil Uthmani' },
  };

  if (!isBundledEdition(edition)) return { arabic, translation: null };
  const tr = BUNDLED_TRANSLATIONS[edition];
  if (!ayahs.every((a) => tr.pick(a))) return { arabic, translation: null };
  const translation: SurahEdition = {
    ...base,
    ayahs: ayahs.map((a) => toAyah(a, tr.pick(a) ?? '', offset)),
    edition: { identifier: edition, language: tr.lang, name: tr.name },
  };
  return { arabic, translation };
}
