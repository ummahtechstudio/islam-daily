import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { fetchSurahList } from './api';
import { fetchWithTimeout } from '../utils/network';
import {
  downloadHadithBook,
  isHadithBookCached,
  clearHadithCache,
} from './hadithCache';
import { clearQuranCache } from './quranCache';
import type { HadithCollectionKey } from './hadiths';

// Per-request timeout for third-party calls inside the long download loops.
// 20 s leaves room for slow mobile networks without letting a single hung
// request stall the entire 114-surah / 12-month batch.
const DL_TIMEOUT_MS = 20000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PackId =
  | 'quranText'
  | 'quranAudioAlafasy'
  | 'quranAudioAbdulBasit'
  | 'hadiths'
  | 'names99'
  | 'calendar'
  | 'duas'
  | 'prayerTimes'
  | 'islamicBooks'
  | 'adhanSounds';

export interface PackStatus {
  downloaded: boolean;
  downloadedAt: number; // unix ms, 0 = never
  sizeBytes: number;
}

export type DownloadStatus = Record<PackId, PackStatus>;

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STATUS: DownloadStatus = {
  quranText:           { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  quranAudioAlafasy:   { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  quranAudioAbdulBasit:{ downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  hadiths:             { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  names99:             { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  calendar:            { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  duas:                { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  prayerTimes:         { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  islamicBooks:        { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
  adhanSounds:         { downloaded: false, downloadedAt: 0, sizeBytes: 0 },
};

const STATUS_KEY = 'dl_status_v2';

// ─── Status helpers ───────────────────────────────────────────────────────────

export async function getDownloadStatus(): Promise<DownloadStatus> {
  try {
    // Try v2 key first, fall back to migrating v1 data
    const raw = await AsyncStorage.getItem(STATUS_KEY);
    if (raw) return { ...DEFAULT_STATUS, ...JSON.parse(raw) };

    const legacy = await AsyncStorage.getItem('dl_status_v1');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = { ...DEFAULT_STATUS, ...parsed };
      await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {}
  return { ...DEFAULT_STATUS };
}

async function markDownloaded(pack: PackId, sizeBytes: number): Promise<void> {
  const status = await getDownloadStatus();
  status[pack] = { downloaded: true, downloadedAt: Date.now(), sizeBytes };
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));
}

export async function clearPack(pack: PackId): Promise<void> {
  const status = await getDownloadStatus();
  status[pack] = { downloaded: false, downloadedAt: 0, sizeBytes: 0 };
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status));

  switch (pack) {
    case 'quranText': {
      const keys = Array.from({ length: 114 }, (_, i) => `offline_surah_${i + 1}`);
      await AsyncStorage.multiRemove(keys);
      // The legacy per-surah AsyncStorage cache + the newer MMKV full-Quran
      // cache are both used by different code paths. Clear both so "delete"
      // is real and not just "delete one of two stores".
      clearQuranCache();
      break;
    }
    case 'hadiths':
      // Clear the canonical MMKV cache (what the reader actually uses)…
      clearHadithCache();
      // …and sweep up any leftover legacy AsyncStorage entries from older
      // app versions so storage usage is accurate.
      await AsyncStorage.multiRemove(['offline_hadiths_local', 'offline_hadiths_index', 'supabase_hadiths']);
      break;
    case 'names99':
      await AsyncStorage.multiRemove(['offline_99names', 'supabase_names']);
      break;
    case 'duas':
      await AsyncStorage.removeItem('supabase_duas');
      break;
    case 'calendar':
      await AsyncStorage.multiRemove(['offline_calendar', 'offline_calendar_dates']);
      break;
    case 'prayerTimes':
      await AsyncStorage.removeItem('offline_prayer_times');
      break;
  }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export async function checkDownloadStatus(feature: PackId): Promise<boolean> {
  const status = await getDownloadStatus();
  return status[feature]?.downloaded ?? false;
}

export async function getStorageUsed(): Promise<number> {
  const status = await getDownloadStatus();
  const totalBytes = Object.values(status).reduce((sum, s) => sum + s.sizeBytes, 0);
  return totalBytes / 1_048_576; // MB
}

// ─── Quran text (Supabase primary, alquran.cloud fallback) ────────────────────

export async function downloadQuran(
  onProgress: (pct: number) => void
): Promise<void> {
  onProgress(2);

  // Try Supabase first
  try {
    await downloadQuranFromSupabase(onProgress);
    return;
  } catch (supabaseErr: any) {
    if (supabaseErr?.message?.includes('No Quran data')) {
      // Table is empty — fall through to alquran.cloud
    } else {
      // Network or other error — fall through to alquran.cloud
    }
  }

  // Fallback: fetch from alquran.cloud
  await downloadQuranFromApi(onProgress);
}

async function downloadQuranFromSupabase(
  onProgress: (pct: number) => void
): Promise<void> {
  onProgress(5);

  // Fetch surah metadata for names/revelationType
  let surahMeta: any[] = [];
  try {
    surahMeta = await fetchSurahList();
  } catch {}

  onProgress(10);

  // Fetch all ayahs in pages of 1000 (Supabase default max 1000)
  let allAyahs: any[] = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('quran_ayahs')
      .select('id, surah_number, ayah_number, arabic_text, english_translation, juz, page')
      .order('id')
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data?.length) break;

    allAyahs = allAyahs.concat(data);
    from += PAGE;

    onProgress(10 + Math.round((allAyahs.length / 6236) * 60));

    if (data.length < PAGE) break;
  }

  if (allAyahs.length === 0) {
    throw new Error('No Quran data in Supabase. Run the seed script first.');
  }

  onProgress(70);

  // Group by surah and build alquran.cloud-compatible format
  const bySurah = new Map<number, any[]>();
  for (const ayah of allAyahs) {
    if (!bySurah.has(ayah.surah_number)) bySurah.set(ayah.surah_number, []);
    bySurah.get(ayah.surah_number)!.push(ayah);
  }

  let totalBytes = 0;
  let done = 0;
  const writtenKeys: string[] = [];

  try {
  for (const [surahNum, ayahs] of bySurah) {
    const meta = surahMeta.find((s: any) => s.number === surahNum);

    const arabicEdition = {
      number: surahNum,
      name: meta?.name ?? '',
      englishName: meta?.englishName ?? `Surah ${surahNum}`,
      englishNameTranslation: meta?.englishNameTranslation ?? '',
      revelationType: meta?.revelationType ?? '',
      numberOfAyahs: ayahs.length,
      ayahs: ayahs.map((a) => ({
        number: a.id,
        text: a.arabic_text,
        numberInSurah: a.ayah_number,
        juz: a.juz ?? 1,
        page: a.page ?? 1,
        sajda: false,
      })),
      edition: { identifier: 'quran-uthmani', language: 'ar', name: 'Uthmani' },
    };

    const translationEdition = {
      ...arabicEdition,
      ayahs: ayahs.map((a) => ({
        number: a.id,
        text: a.english_translation ?? '',
        numberInSurah: a.ayah_number,
        juz: a.juz ?? 1,
        page: a.page ?? 1,
        sajda: false,
      })),
      edition: { identifier: 'en.asad', language: 'en', name: 'Asad' },
    };

    const str = JSON.stringify([arabicEdition, translationEdition]);
    const key = `offline_surah_${surahNum}`;
    await AsyncStorage.setItem(key, str);
    writtenKeys.push(key);
    totalBytes += str.length;
    done++;
    onProgress(70 + Math.round((done / 114) * 28));
  }
  } catch (err) {
    // Don't leave a half-written Quran on disk: clear the partial keys so the
    // reader can't serve an incomplete Quran while status shows not-downloaded.
    if (writtenKeys.length) await AsyncStorage.multiRemove(writtenKeys).catch(() => {});
    throw err;
  }

  onProgress(100);
  await markDownloaded('quranText', totalBytes);
}

async function downloadQuranFromApi(
  onProgress: (pct: number) => void
): Promise<void> {
  const TOTAL = 114;
  const BATCH = 5;
  let totalBytes = 0;
  let okCount = 0;

  for (let start = 1; start <= TOTAL; start += BATCH) {
    const nums = Array.from(
      { length: Math.min(BATCH, TOTAL - start + 1) },
      (_, i) => start + i
    );

    await Promise.all(
      nums.map(async (n) => {
        const existing = await AsyncStorage.getItem(`offline_surah_${n}`);
        if (existing) { totalBytes += existing.length; okCount += 1; return; }

        try {
          const res = await fetchWithTimeout(
            `https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,en.asad`,
            {},
            DL_TIMEOUT_MS,
          );
          if (!res.ok) return;
          const json = await res.json();
          if (json.code === 200) {
            const str = JSON.stringify(json.data);
            await AsyncStorage.setItem(`offline_surah_${n}`, str);
            totalBytes += str.length;
            okCount += 1;
          }
        } catch {
          // A single surah failure shouldn't kill the loop — skip and continue.
        }
      })
    );

    onProgress(Math.round((Math.min(start + BATCH - 1, TOTAL) / TOTAL) * 100));
  }

  if (okCount === 0) {
    throw new Error('Quran download failed: no surahs could be fetched.');
  }
  await markDownloaded('quranText', totalBytes);
  if (okCount < TOTAL) {
    console.warn(`[download] Quran: ${TOTAL - okCount}/${TOTAL} surahs failed; saved ${okCount}.`);
  }
}

// ─── Hadiths ──────────────────────────────────────────────────────────────────
//
// The user-facing hadith reader reads from MMKV via `hadithCache.ts` (R2 as
// source). The Downloads screen now drives that same path — fetching all six
// collections in sequence — so "downloaded" status here matches what the
// reader actually serves offline.
//
// (The previous implementation wrote a totally separate AsyncStorage index
// from a different schema, so the pack could report "downloaded" while the
// reader saw nothing cached.)

const ALL_HADITH_BOOKS: HadithCollectionKey[] = [
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

export async function downloadHadiths(
  onProgress: (pct: number) => void
): Promise<void> {
  onProgress(2);

  let totalBytes = 0;
  for (let i = 0; i < ALL_HADITH_BOOKS.length; i++) {
    const slug = ALL_HADITH_BOOKS[i];
    if (!isHadithBookCached(slug)) {
      try {
        const entry = await downloadHadithBook(slug);
        // Rough size proxy — hadithCache doesn't expose stored byte size, but
        // ~1 KB per hadith is the right order of magnitude for status display.
        totalBytes += entry.totalCount * 1024;
      } catch (err) {
        console.warn(`[downloadHadiths] book ${slug} failed`, err);
        throw err;
      }
    }
    onProgress(Math.round(((i + 1) / ALL_HADITH_BOOKS.length) * 100));
  }

  await markDownloaded('hadiths', Math.max(totalBytes, 5_000_000));
}

// ─── Duas (Supabase primary, local hisnul_muslim fallback) ───────────────────

export async function downloadDuas(
  onProgress: (pct: number) => void
): Promise<void> {
  onProgress(5);

  try {
    const { data, error } = await supabase
      .from('duas')
      .select('*')
      .order('id');

    if (!error && data && data.length > 0) {
      onProgress(80);
      const str = JSON.stringify(data);
      await AsyncStorage.setItem('supabase_duas', str);
      onProgress(100);
      await markDownloaded('duas', str.length);
      return;
    }
  } catch {}

  // Fallback: bundled hisnul_muslim.json is already local — just mark downloaded
  onProgress(60);
  await new Promise<void>((r) => setTimeout(r, 100));
  onProgress(100);
  await markDownloaded('duas', 85_000);
}

// ─── 99 Names (Supabase primary, ummahapi fallback) ──────────────────────────

export async function downloadNames(
  onProgress: (pct: number) => void
): Promise<void> {
  onProgress(5);

  try {
    const { data, error } = await supabase
      .from('names_of_allah')
      .select('*')
      .order('number');

    if (!error && data && data.length > 0) {
      onProgress(70);
      const str = JSON.stringify(data);
      await AsyncStorage.setItem('supabase_names', str);
      onProgress(100);
      await markDownloaded('names99', str.length);
      return;
    }
  } catch {}

  // Fallback: bundled local asset (no network needed)
  onProgress(40);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const local = require('../../assets/data/names99.json') as any[];
  const str = JSON.stringify(local);
  await AsyncStorage.setItem('offline_99names', str);
  onProgress(100);
  await markDownloaded('names99', str.length);
}

// ─── Unavailable packs (need expo-file-system) ────────────────────────────────

export async function downloadQuranAudio(
  _onProgress: (pct: number) => void
): Promise<void> {
  throw new Error('NEEDS_FILE_SYSTEM: Install expo-file-system to enable audio downloads.');
}

// ─── Islamic calendar ─────────────────────────────────────────────────────────

export async function downloadCalendar(
  onProgress: (pct: number) => void
): Promise<void> {
  const now = new Date();
  const months: { month: number; year: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }

  const allMonths: any[] = [];
  for (let i = 0; i < months.length; i++) {
    const { month, year } = months[i];
    try {
      const res = await fetchWithTimeout(
        `https://api.aladhan.com/v1/calendar?month=${month}&year=${year}`,
        {},
        DL_TIMEOUT_MS,
      );
      if (res.ok) {
        const json = await res.json();
        if (json.code === 200 && Array.isArray(json.data)) {
          allMonths.push({ month, year, data: json.data });
        }
      }
    } catch {}
    onProgress(Math.round(((i + 1) / months.length) * 100));
  }

  if (allMonths.length === 0) {
    throw new Error('Calendar download failed: no months could be fetched.');
  }
  const str = JSON.stringify(allMonths);
  await AsyncStorage.setItem('offline_calendar', str);
  await markDownloaded('calendar', str.length);
  const failed = months.length - allMonths.length;
  if (failed > 0) {
    console.warn(`[download] calendar: ${failed}/${months.length} months failed; saved ${allMonths.length}.`);
  }
}

// ─── Prayer times ─────────────────────────────────────────────────────────────

export async function downloadPrayerTimes(
  onProgress: (pct: number) => void
): Promise<void> {
  onProgress(30);
  const keys = await AsyncStorage.getAllKeys();
  const prayerKeys = keys.filter((k) => k.startsWith('api_prayers_'));
  onProgress(70);

  let totalBytes = 0;
  if (prayerKeys.length > 0) {
    const pairs = await AsyncStorage.multiGet(prayerKeys);
    for (const [, v] of pairs) if (v) totalBytes += v.length;
  }

  onProgress(100);
  // Prayer times are computed locally (the adhan engine) and need no download,
  // so record the real cached size (often 0) rather than fabricating ~50 KB.
  await markDownloaded('prayerTimes', totalBytes);
}

// ─── Download all (serial) ────────────────────────────────────────────────────

export type ProgressCallback = (pack: PackId, pct: number) => void;

export async function downloadAll(onProgress: ProgressCallback): Promise<void> {
  const packs: [PackId, (cb: (p: number) => void) => Promise<void>][] = [
    ['duas',        downloadDuas],
    ['hadiths',     downloadHadiths],
    ['names99',     downloadNames],
    ['prayerTimes', downloadPrayerTimes],
    ['calendar',    downloadCalendar],
    ['quranText',   downloadQuran],
  ];

  for (const [id, fn] of packs) {
    await fn((p) => onProgress(id, p));
  }
}

// ─── Offline data readers ─────────────────────────────────────────────────────

export async function getOfflineSurah(n: number): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`offline_surah_${n}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function getOfflineHadithsByCollection(
  collection: string
): Promise<any[] | null> {
  try {
    // Try Supabase-sourced data first (richer dataset)
    const sbRaw = await AsyncStorage.getItem('supabase_hadiths');
    if (sbRaw) {
      const all: any[] = JSON.parse(sbRaw);
      const filtered = all.filter((h) => h.collection === collection);
      if (filtered.length > 0) return filtered;
    }

    // Fall back to collection index (from local JSON or API download)
    const raw = await AsyncStorage.getItem('offline_hadiths_index');
    if (!raw) return null;
    const index = JSON.parse(raw);
    return index[collection] ?? null;
  } catch { return null; }
}

export async function getOfflineNames(): Promise<any[] | null> {
  try {
    const sbRaw = await AsyncStorage.getItem('supabase_names');
    if (sbRaw) return JSON.parse(sbRaw);

    const raw = await AsyncStorage.getItem('offline_99names');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function getOfflineDuas(): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem('supabase_duas');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function getOfflineCalendar(
  month: number,
  year: number
): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem('offline_calendar');
    if (!raw) return null;
    const all: { month: number; year: number; data: any[] }[] = JSON.parse(raw);
    return all.find((m) => m.month === month && m.year === year)?.data ?? null;
  } catch { return null; }
}
