/**
 * Single source of truth for Quran ayah data after Phase O.2.
 *
 * On first launch the entire 6,236-ayah Indo-Pak / Tanzil dataset is fetched
 * from Supabase in batches and stored as one indexed object in MMKV under
 * `CACHE_KEYS.QURAN_FULL`. Subsequent reads are synchronous in-memory and
 * the Quran works fully offline.
 *
 * Nothing else in the app should call Supabase for ayah data — go through
 * `getAyahsForPage` / `getAyahsForSurah` instead.
 */

import { supabase } from '../lib/supabase';
import { CACHE_KEYS, cache } from '../lib/storage';

const QURAN_CACHE_VERSION = 1;
const FETCH_BATCH_SIZE = 700;
export const EXPECTED_AYAH_COUNT = 6236;
const FETCH_RETRIES = 2;

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
  version: number;
  fetchedAt: number;
  byPage: Record<number, AyahLite[]>;
  bySurah: Record<number, AyahLite[]>;
  totalAyahs: number;
};

export type DownloadProgress = {
  fetched: number;
  total: number;
  batchIndex: number;
  totalBatches: number;
};

let inMemoryIndex: QuranIndex | null = null;

export function getQuranFromCache(): QuranIndex | null {
  if (inMemoryIndex) return inMemoryIndex;
  const stored = cache.getJSON<QuranIndex>(CACHE_KEYS.QURAN_FULL);
  if (
    stored &&
    stored.version === QURAN_CACHE_VERSION &&
    stored.totalAyahs === EXPECTED_AYAH_COUNT
  ) {
    inMemoryIndex = stored;
    return stored;
  }
  return null;
}

export function getAyahsForPage(pageNumber: number): AyahLite[] {
  return getQuranFromCache()?.byPage[pageNumber] ?? [];
}

export function getAyahsForSurah(surahNumber: number): AyahLite[] {
  return getQuranFromCache()?.bySurah[surahNumber] ?? [];
}

export function isQuranCached(): boolean {
  const idx = getQuranFromCache();
  return !!idx && idx.totalAyahs === EXPECTED_AYAH_COUNT;
}

export function clearQuranCache(): void {
  cache.delete(CACHE_KEYS.QURAN_FULL);
  inMemoryIndex = null;
}

interface SupabaseAyahRow {
  surah_number: number;
  ayah_number: number;
  text_indopak: string | null;
  arabic_text: string | null;
  urdu_translation: string | null;
  english_translation: string | null;
  page_indopak: number | null;
}

const COLUMNS =
  'surah_number, ayah_number, text_indopak, arabic_text, urdu_translation, english_translation, page_indopak';

async function fetchBatch(from: number, to: number): Promise<SupabaseAyahRow[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    const { data, error } = await supabase
      .from('quran_ayahs')
      .select(COLUMNS)
      .order('surah_number', { ascending: true })
      .order('ayah_number', { ascending: true })
      .range(from, to);
    if (!error && data) return data as unknown as SupabaseAyahRow[];
    lastError = error;
  }
  const msg =
    lastError instanceof Error
      ? lastError.message
      : typeof lastError === 'object' && lastError !== null && 'message' in lastError
        ? String((lastError as { message: unknown }).message)
        : 'Unknown Supabase error';
  throw new Error(`Failed to fetch Quran batch ${from}-${to}: ${msg}`);
}

export async function downloadFullQuran(
  onProgress?: (p: DownloadProgress) => void,
): Promise<QuranIndex> {
  const totalBatches = Math.ceil(EXPECTED_AYAH_COUNT / FETCH_BATCH_SIZE);
  const byPage: Record<number, AyahLite[]> = {};
  const bySurah: Record<number, AyahLite[]> = {};
  let fetched = 0;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const from = batchIndex * FETCH_BATCH_SIZE;
    const to = Math.min(from + FETCH_BATCH_SIZE - 1, EXPECTED_AYAH_COUNT - 1);
    const rows = await fetchBatch(from, to);

    for (const row of rows) {
      const ayah: AyahLite = {
        surah: row.surah_number,
        ayah: row.ayah_number,
        text_indopak: row.text_indopak ?? '',
        text_arabic: row.arabic_text ?? undefined,
        translation_ur: row.urdu_translation ?? undefined,
        translation_en: row.english_translation ?? undefined,
        page_indopak: row.page_indopak ?? 0,
      };
      (byPage[ayah.page_indopak] ??= []).push(ayah);
      (bySurah[ayah.surah] ??= []).push(ayah);
    }

    fetched += rows.length;
    onProgress?.({
      fetched,
      total: EXPECTED_AYAH_COUNT,
      batchIndex: batchIndex + 1,
      totalBatches,
    });
  }

  if (fetched !== EXPECTED_AYAH_COUNT) {
    throw new Error(
      `Quran download incomplete: expected ${EXPECTED_AYAH_COUNT} ayahs, got ${fetched}.`,
    );
  }

  const index: QuranIndex = {
    version: QURAN_CACHE_VERSION,
    fetchedAt: Date.now(),
    byPage,
    bySurah,
    totalAyahs: fetched,
  };

  cache.setJSON(CACHE_KEYS.QURAN_FULL, index);
  inMemoryIndex = index;
  return index;
}

// TODO: expose a "Re-download Quran content" action from settings once a
// settings screen is built. For now, support cases can call clearQuranCache()
// + downloadFullQuran() manually.
