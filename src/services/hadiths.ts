/**
 * Lower-level R2 fetch + normalization helpers for hadith collections.
 *
 * The MMKV cache + the public `getHadithsForBook` / `downloadHadithBook` API
 * lives in `./hadithCache.ts`. This module just exposes the raw R2 fetch
 * pipeline so the cache layer can call it.
 */

import { HadithGrade, SupabaseHadith } from '../lib/supabase';
import { fetchWithTimeout } from '../utils/network';

// Hadith collections are large (Bukhari ~22 MB trilingual). Give them more
// headroom than the default 15s so slow connections don't abort mid-download.
const HADITH_TIMEOUT_MS = 45000;

// v2: aligned trilingual set (Arabic + English + Urdu, shared hadithnumber).
// The previous `hadiths/` path (A7med3bdulBaset, English-only) is retired.
export const R2_HADITHS_BASE_URL =
  'https://pub-3f76e9c4da264c6ba85283d8af8108a0.r2.dev/hadiths-v2';

// Totals from hadiths-v2/index.json (full record counts incl. fractional
// sub-narrations and any-language records).
export const DEFAULT_COLLECTION_COUNTS: Record<string, number> = {
  bukhari: 7589,
  muslim: 7564,
  tirmidhi: 3998,
  abudawud: 5274,
  ibnmajah: 4343,
  nasai: 5765,
  malik: 1889,
  nawawi: 42,
  qudsi: 40,
  dehlawi: 40,
};

export type HadithCollectionKey =
  | 'bukhari'
  | 'muslim'
  | 'tirmidhi'
  | 'abudawud'
  | 'ibnmajah'
  | 'nasai'
  | 'malik'
  | 'nawawi'
  | 'qudsi'
  | 'dehlawi';

export const COLLECTION_NAMES: Record<HadithCollectionKey, string> = {
  bukhari: 'Sahih Bukhari',
  muslim: 'Sahih Muslim',
  tirmidhi: 'Jami at-Tirmidhi',
  abudawud: 'Sunan Abu Dawud',
  ibnmajah: 'Sunan Ibn Majah',
  nasai: "Sunan an-Nasa'i",
  malik: 'Muwatta Malik',
  nawawi: 'Forty Hadith of an-Nawawi',
  qudsi: 'Forty Hadith Qudsi',
  dehlawi: 'Forty Hadith of Shah Waliullah Dehlawi',
};

interface RawGrade {
  name?: string;
  grade?: string;
}

interface RawHadith {
  hadithnumber?: number | string;
  arabicnumber?: number | string;
  reference?: { book?: number | null; hadith?: number | null } | null;
  section?: string | null;
  arabic?: string | null;
  english?: string | null;
  urdu?: string | null;
  grades?: RawGrade[];
}

export interface RawCollection {
  metadata?: { name?: string; collection?: string; total?: number };
  hadiths?: RawHadith[];
}

export interface CollectionLoadProgress {
  receivedBytes: number;
  totalBytes: number | null;
  phase: 'downloading' | 'parsing' | 'done';
}

export type ProgressCallback = (p: CollectionLoadProgress) => void;

export function normalize(
  collectionKey: HadithCollectionKey,
  raw: RawCollection,
): SupabaseHadith[] {
  const collectionName = COLLECTION_NAMES[collectionKey];

  const out: SupabaseHadith[] = [];
  const hadiths = raw.hadiths ?? [];
  for (let i = 0; i < hadiths.length; i++) {
    const h = hadiths[i];
    // hadithnumber may be fractional (sub-narrations, e.g. 631.5) — keep it as
    // a string so the value is preserved exactly for display and lookup.
    const hadithNumber = String(h.hadithnumber ?? i + 1);
    const grades: HadithGrade[] = Array.isArray(h.grades)
      ? h.grades
          .filter((g) => g && g.name && g.grade)
          .map((g) => ({ name: String(g.name), grade: String(g.grade) }))
      : [];

    out.push({
      // Stable, unique per record within the collection (hadithnumber may
      // repeat across collections; the array index never collides here).
      id: i,
      collection_key: collectionKey,
      collection_name: collectionName,
      book_id: h.reference?.book ?? null,
      book_name: null,
      chapter_id: null,
      chapter_name: h.section ?? null,
      hadith_number: hadithNumber,
      arabic: h.arabic ?? null,
      english: h.english ?? null,
      urdu: h.urdu ?? null,
      grades,
    });
  }
  return out;
}

export async function fetchCollectionText(
  url: string,
  onProgress?: ProgressCallback,
): Promise<string> {
  onProgress?.({ receivedBytes: 0, totalBytes: null, phase: 'downloading' });
  const res = await fetchWithTimeout(url, {}, HADITH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  const totalHeader = res.headers.get('content-length');
  const totalBytes = totalHeader ? Number(totalHeader) : null;

  const text = await res.text();
  onProgress?.({
    receivedBytes: text.length,
    totalBytes: totalBytes ?? text.length,
    phase: 'parsing',
  });
  return text;
}
