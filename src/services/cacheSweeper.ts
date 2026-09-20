/**
 * Settings → Clear Cache.
 *
 * Sweeps only re-fetchable derived data. Everything the user chose to keep —
 * settings, bookmarks, progress, and the packs managed on the Downloads
 * screen (offline Quran/duas/names, hadith books) — is deliberately not
 * touched here; the Downloads screen owns pack deletion.
 *
 * What counts as cache:
 *   AsyncStorage  `api_*`    — alquran.cloud responses (`api_surah_list`,
 *                              `api_surah_<n>_<edition>` from
 *                              services/api.ts) plus any stale `api_prayers_*`
 *                              / `api_qibla_*` rows from older builds
 *                 `cache_*`  — the CACHE_KEYS in constants/index.ts (nothing
 *                              writes them today, kept so nothing lingers)
 *   MMKV `cache`  content snapshots refreshed from Supabase on launch
 *                 (names99/duas/dhikr — the bundled JSON takes over until the
 *                 next refresh), the Daily Knowledge card, and the legacy
 *                 pre-bundle Quran snapshot.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cache, CACHE_KEYS } from '../lib/storage';

const ASYNC_PREFIXES = ['api_', 'cache_'] as const;

const MMKV_CACHE_KEYS: readonly string[] = [
  CACHE_KEYS.NAMES_99,
  CACHE_KEYS.DUAS,
  CACHE_KEYS.DHIKR,
  CACHE_KEYS.DAILY_KNOWLEDGE_LAST,
  CACHE_KEYS.QURAN_FULL,
  CACHE_KEYS.QURAN_LAST_FETCHED,
];

export type CacheSweepGroup = 'api' | 'content' | 'dailyKnowledge';

export type CacheSweepSummary = {
  /** Number of storage entries found / removed. */
  entries: number;
  /** Approximate size (UTF-16 code units of the stored strings ≈ bytes). */
  bytes: number;
  /** Which kinds of data were present, for the confirmation message. */
  groups: CacheSweepGroup[];
};

type Found = {
  asyncKeys: string[];
  mmkvKeys: string[];
  summary: CacheSweepSummary;
};

function groupFor(key: string): CacheSweepGroup {
  if (key === CACHE_KEYS.DAILY_KNOWLEDGE_LAST) return 'dailyKnowledge';
  if (key.startsWith('api_') || key.startsWith('cache_')) return 'api';
  return 'content';
}

async function findClearableCache(): Promise<Found> {
  const groups = new Set<CacheSweepGroup>();
  let entries = 0;
  let bytes = 0;

  const allKeys = await AsyncStorage.getAllKeys();
  const asyncKeys = allKeys.filter((k) => ASYNC_PREFIXES.some((p) => k.startsWith(p)));
  if (asyncKeys.length > 0) {
    const pairs = await AsyncStorage.multiGet(asyncKeys);
    for (const [k, v] of pairs) {
      entries += 1;
      bytes += v?.length ?? 0;
      groups.add(groupFor(k));
    }
  }

  const mmkvKeys = MMKV_CACHE_KEYS.filter((k) => cache.has(k));
  for (const k of mmkvKeys) {
    entries += 1;
    bytes += cache.get(k)?.length ?? 0;
    groups.add(groupFor(k));
  }

  return { asyncKeys, mmkvKeys, summary: { entries, bytes, groups: [...groups] } };
}

/** What Clear Cache would remove right now (drives the "Cached Data" row). */
export async function measureClearableCache(): Promise<CacheSweepSummary> {
  return (await findClearableCache()).summary;
}

/** Removes the clearable cache and reports what was removed. */
export async function clearClearableCache(): Promise<CacheSweepSummary> {
  const { asyncKeys, mmkvKeys, summary } = await findClearableCache();
  if (asyncKeys.length > 0) await AsyncStorage.multiRemove(asyncKeys);
  for (const k of mmkvKeys) cache.delete(k);
  return summary;
}
