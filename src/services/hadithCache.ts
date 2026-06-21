/**
 * MMKV-backed lazy per-book cache for hadith collections.
 *
 * First open of a book downloads its R2 JSON and stores it under
 * `CACHE_KEYS.HADITH_BOOK(slug)`. Subsequent opens are synchronous and
 * fully offline. Books not yet opened stay uncached.
 */

import { SupabaseHadith } from '../lib/supabase';
import { CACHE_KEYS, cache } from '../lib/storage';
import {
  fetchCollectionText,
  normalize,
  R2_HADITHS_BASE_URL,
  type HadithCollectionKey,
  type RawCollection,
} from './hadiths';

// v2: new trilingual schema (arabic/english/urdu + grades[]) from hadiths-v2/.
// Bumped from 1 → 2 so any cache written under the old A7med3bdulBaset shape
// (idInBook numbering, English-only) is discarded and re-fetched.
const HADITH_CACHE_VERSION = 2;

const ALL_BOOK_SLUGS: HadithCollectionKey[] = [
  'bukhari',
  'muslim',
  'tirmidhi',
  'abudawud',
  'ibnmajah',
  'nasai',
  'malik',
  'nawawi',
  'qudsi',
  'dehlawi',
];

export type HadithBookCache = {
  version: number;
  bookSlug: HadithCollectionKey;
  fetchedAt: number;
  hadiths: SupabaseHadith[];
  totalCount: number;
};

export type HadithDownloadProgress = {
  bookSlug: HadithCollectionKey;
  receivedBytes: number;
  totalBytes: number | null;
  phase: 'downloading' | 'parsing' | 'done';
};

const inMemoryBookCache = new Map<HadithCollectionKey, HadithBookCache>();
const inflightDownloads = new Map<HadithCollectionKey, Promise<HadithBookCache>>();

export function getHadithBookFromCache(
  slug: HadithCollectionKey,
): HadithBookCache | null {
  const memHit = inMemoryBookCache.get(slug);
  if (memHit) return memHit;

  const stored = cache.getJSON<HadithBookCache>(CACHE_KEYS.HADITH_BOOK(slug));
  if (stored && stored.version === HADITH_CACHE_VERSION && Array.isArray(stored.hadiths)) {
    inMemoryBookCache.set(slug, stored);
    return stored;
  }
  return null;
}

export function isHadithBookCached(slug: HadithCollectionKey): boolean {
  return !!getHadithBookFromCache(slug);
}

export function getHadithsForBook(slug: HadithCollectionKey): SupabaseHadith[] {
  return getHadithBookFromCache(slug)?.hadiths ?? [];
}

export function getCachedHadithCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const slug of ALL_BOOK_SLUGS) {
    const entry = getHadithBookFromCache(slug);
    if (entry) out[slug] = entry.totalCount;
  }
  return out;
}

export async function downloadHadithBook(
  slug: HadithCollectionKey,
  onProgress?: (p: HadithDownloadProgress) => void,
): Promise<HadithBookCache> {
  const existing = inflightDownloads.get(slug);
  if (existing) return existing;

  const job = (async () => {
    const url = `${R2_HADITHS_BASE_URL}/${slug}.json`;
    const text = await fetchCollectionText(url, (p) => {
      onProgress?.({
        bookSlug: slug,
        receivedBytes: p.receivedBytes,
        totalBytes: p.totalBytes,
        phase: p.phase,
      });
    });

    let raw: RawCollection;
    try {
      raw = JSON.parse(text) as RawCollection;
    } catch {
      throw new Error(`Invalid JSON for ${slug}`);
    }

    const hadiths = normalize(slug, raw);
    if (hadiths.length === 0) {
      throw new Error(`Parsed 0 hadiths from ${slug}.json`);
    }

    const entry: HadithBookCache = {
      version: HADITH_CACHE_VERSION,
      bookSlug: slug,
      fetchedAt: Date.now(),
      hadiths,
      totalCount: hadiths.length,
    };

    const persisted = cache.setJSON<HadithBookCache>(CACHE_KEYS.HADITH_BOOK(slug), entry);
    if (!persisted && __DEV__) {
      console.warn(
        `[hadithCache] "${slug}" did not persist (likely too large for MMKV); ` +
        `it will serve this session but re-download on next launch.`,
      );
    }
    inMemoryBookCache.set(slug, entry);
    onProgress?.({
      bookSlug: slug,
      receivedBytes: text.length,
      totalBytes: text.length,
      phase: 'done',
    });
    return entry;
  })();

  inflightDownloads.set(slug, job);
  try {
    return await job;
  } finally {
    inflightDownloads.delete(slug);
  }
}

export function clearHadithCache(slug?: HadithCollectionKey): void {
  if (slug) {
    cache.delete(CACHE_KEYS.HADITH_BOOK(slug));
    inMemoryBookCache.delete(slug);
    return;
  }
  for (const s of ALL_BOOK_SLUGS) {
    cache.delete(CACHE_KEYS.HADITH_BOOK(s));
  }
  inMemoryBookCache.clear();
}
