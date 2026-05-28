/**
 * Lower-level R2 fetch + normalization helpers for hadith collections.
 *
 * The MMKV cache + the public `getHadithsForBook` / `downloadHadithBook` API
 * lives in `./hadithCache.ts`. This module just exposes the raw R2 fetch
 * pipeline so the cache layer can call it.
 */

import { SupabaseHadith } from '../lib/supabase';
import { fetchWithTimeout } from '../utils/network';

// Hadith collections are large (Bukhari ~12 MB). Give them more headroom than
// the default 15s so slow connections don't abort mid-download.
const HADITH_TIMEOUT_MS = 45000;

export const R2_HADITHS_BASE_URL =
  'https://pub-3f76e9c4da264c6ba85283d8af8108a0.r2.dev/hadiths';

export const DEFAULT_COLLECTION_COUNTS: Record<string, number> = {
  bukhari: 7277,
  muslim: 7563,
  tirmidhi: 3956,
  abudawud: 5274,
  ibnmajah: 4341,
  nasai: 5767,
};

export type HadithCollectionKey =
  | 'bukhari'
  | 'muslim'
  | 'tirmidhi'
  | 'abudawud'
  | 'ibnmajah'
  | 'nasai';

export const COLLECTION_NAMES: Record<HadithCollectionKey, string> = {
  bukhari: 'Sahih Bukhari',
  muslim: 'Sahih Muslim',
  tirmidhi: 'Jami at-Tirmidhi',
  abudawud: 'Sunan Abu Dawud',
  ibnmajah: 'Sunan Ibn Majah',
  nasai: "Sunan an-Nasa'i",
};

interface RawChapter {
  id: number;
  bookId?: number;
  arabic?: string;
  english?: string;
}

interface RawHadith {
  id: number;
  idInBook?: number;
  chapterId?: number;
  bookId?: number;
  arabic?: string;
  english?: { narrator?: string; text?: string } | string;
}

export interface RawCollection {
  id?: number;
  metadata?: { name?: string; arabic?: string; english?: string };
  chapters?: RawChapter[];
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
  const chaptersById = new Map<number, RawChapter>();
  for (const ch of raw.chapters ?? []) chaptersById.set(ch.id, ch);

  const out: SupabaseHadith[] = [];
  for (const h of raw.hadiths ?? []) {
    const englishText =
      typeof h.english === 'string' ? h.english : h.english?.text ?? null;
    const narrator =
      typeof h.english === 'string' ? null : h.english?.narrator ?? null;
    const chapter = h.chapterId != null ? chaptersById.get(h.chapterId) : null;

    out.push({
      id: h.id,
      collection_key: collectionKey,
      collection_name: collectionName,
      book_id: h.bookId ?? null,
      book_name: null,
      chapter_id: h.chapterId ?? null,
      chapter_name: chapter?.english ?? chapter?.arabic ?? null,
      hadith_number: String(h.idInBook ?? h.id),
      arabic: h.arabic ?? null,
      english: englishText,
      narrator,
      grade: null,
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
