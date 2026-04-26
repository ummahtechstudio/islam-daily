import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseHadith } from '../lib/supabase';
import { HADITH_COLLECTIONS } from '../constants';

export const R2_HADITHS_BASE_URL =
  'https://pub-3f76e9c4da264c6ba85283d8af8108a0.r2.dev/hadiths';

const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const CACHE_PREFIX = 'r2_hadith_collection_';

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

interface RawCollection {
  id?: number;
  metadata?: { name?: string; arabic?: string; english?: string };
  chapters?: RawChapter[];
  hadiths?: RawHadith[];
}

const COLLECTION_NAMES: Record<HadithCollectionKey, string> = {
  bukhari: 'Sahih Bukhari',
  muslim: 'Sahih Muslim',
  tirmidhi: 'Jami at-Tirmidhi',
  abudawud: 'Sunan Abu Dawud',
  ibnmajah: 'Sunan Ibn Majah',
  nasai: "Sunan an-Nasa'i",
};

export interface CollectionLoadProgress {
  receivedBytes: number;
  totalBytes: number | null;
  phase: 'downloading' | 'parsing' | 'done';
}

export type ProgressCallback = (p: CollectionLoadProgress) => void;

function isValidCacheEntry(parsed: unknown): parsed is {
  ts: number;
  hadiths: SupabaseHadith[];
} {
  return (
    !!parsed &&
    typeof parsed === 'object' &&
    'ts' in parsed &&
    'hadiths' in parsed &&
    Array.isArray((parsed as { hadiths: unknown }).hadiths)
  );
}

async function readCache(
  key: HadithCollectionKey,
): Promise<SupabaseHadith[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidCacheEntry(parsed)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.hadiths;
  } catch {
    return null;
  }
}

async function writeCache(
  key: HadithCollectionKey,
  hadiths: SupabaseHadith[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ ts: Date.now(), hadiths }),
    );
  } catch {}
}

function normalize(
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

async function fetchCollectionText(
  url: string,
  onProgress?: ProgressCallback,
): Promise<string> {
  onProgress?.({ receivedBytes: 0, totalBytes: null, phase: 'downloading' });
  const res = await fetch(url);
  console.log('[Hadith Service] Response status:', res.status, 'for', url);
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

export async function getCollection(
  key: HadithCollectionKey,
  onProgress?: ProgressCallback,
): Promise<SupabaseHadith[]> {
  const cached = await readCache(key);
  if (cached) {
    console.log('[Hadith Service] Using cache for', key, '— count:', cached.length);
    onProgress?.({ receivedBytes: 0, totalBytes: null, phase: 'done' });
    return cached;
  }

  const url = `${R2_HADITHS_BASE_URL}/${key}.json`;
  console.log('[Hadith Service] Fetching:', url);
  const text = await fetchCollectionText(url, onProgress);
  console.log('[Hadith Service] Downloaded bytes:', text.length);

  let raw: RawCollection;
  try {
    raw = JSON.parse(text) as RawCollection;
  } catch (e) {
    console.error('[Hadith Service] JSON parse failed for', key, e);
    throw new Error(`Invalid JSON for ${key}`);
  }

  console.log('[Hadith Service] Raw data keys:', Object.keys(raw ?? {}));
  console.log('[Hadith Service] Raw hadiths array length:', raw?.hadiths?.length ?? 0);
  if (raw?.hadiths?.[0]) {
    console.log(
      '[Hadith Service] First raw hadith preview:',
      JSON.stringify(raw.hadiths[0]).slice(0, 300),
    );
  }

  const hadiths = normalize(key, raw);
  console.log('[Hadith Service] Normalized count for', key, ':', hadiths.length);

  if (hadiths.length === 0) {
    throw new Error(`Parsed 0 hadiths from ${key}.json — unexpected structure`);
  }

  await writeCache(key, hadiths);
  onProgress?.({
    receivedBytes: text.length,
    totalBytes: text.length,
    phase: 'done',
  });
  return hadiths;
}

export async function getCollectionCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const col of HADITH_COLLECTIONS) {
    const cached = await readCache(col.key as HadithCollectionKey);
    if (cached) counts[col.key] = cached.length;
  }
  return counts;
}

export async function clearCollectionCache(
  key: HadithCollectionKey,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch {}
}
