/**
 * Synchronous key/value storage backed by react-native-mmkv with a graceful
 * in-memory fallback if MMKV cannot initialise (e.g. running under web,
 * Expo Go, or before a custom dev client is built).
 *
 * Two namespaces:
 *   `cache`  — clearable derived data (Supabase content snapshots, fetch caches)
 *   `prefs`  — durable user preferences
 *
 * AsyncStorage is intentionally NOT replaced; existing AsyncStorage keys
 * (Quran tabs/page/font, Tasbeeh counters/settings, download status, etc.)
 * stay where they are.
 */

interface SyncKV {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  contains(key: string): boolean;
  clearAll(): void;
}

// On Expo Web's SSR pass `window` is undefined; native modules and even the
// in-memory fallback should no-op so renders can complete without throwing.
const isClient = typeof window !== 'undefined';

function createInMemoryStore(): SyncKV {
  const map = new Map<string, string>();
  return {
    getString: (k) => map.get(k),
    set: (k, v) => { map.set(k, v); },
    delete: (k) => { map.delete(k); },
    contains: (k) => map.has(k),
    clearAll: () => { map.clear(); },
  };
}

function createMmkvStore(id: string): SyncKV {
  if (!isClient) return createInMemoryStore();
  try {
    // Lazy require so a missing native module doesn't break the JS bundle.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const m = createMMKV({ id });
    return {
      getString: (k) => m.getString(k),
      set: (k, v) => m.set(k, v),
      delete: (k) => { m.remove(k); },
      contains: (k) => m.contains(k),
      clearAll: () => m.clearAll(),
    };
  } catch (err) {
    console.warn(
      `[storage] MMKV unavailable for "${id}", falling back to in-memory store. ` +
      `Cache will not persist across app restarts. Rebuild the dev client with ` +
      `"npx expo prebuild" + "expo run:android" after adding native modules. ` +
      `Error: ${(err as Error)?.message ?? err}`
    );
    return createInMemoryStore();
  }
}

function makeNamespace(store: SyncKV) {
  return {
    get: (key: string): string | undefined => {
      if (!isClient) return undefined;
      try { return store.getString(key); } catch { return undefined; }
    },
    set: (key: string, value: string): void => {
      if (!isClient) return;
      try { store.set(key, value); } catch { /* swallow */ }
    },
    getJSON: <T>(key: string): T | null => {
      if (!isClient) return null;
      let raw: string | undefined;
      try { raw = store.getString(key); } catch { return null; }
      if (!raw) return null;
      try { return JSON.parse(raw) as T; } catch { return null; }
    },
    setJSON: <T>(key: string, value: T): void => {
      if (!isClient) return;
      try { store.set(key, JSON.stringify(value)); } catch { /* swallow */ }
    },
    delete: (key: string): void => {
      if (!isClient) return;
      try { store.delete(key); } catch { /* swallow */ }
    },
    clearAll: (): void => {
      if (!isClient) return;
      try { store.clearAll(); } catch { /* swallow */ }
    },
    has: (key: string): boolean => {
      if (!isClient) return false;
      try { return store.contains(key); } catch { return false; }
    },
  };
}

const cacheStore = createMmkvStore('islam-daily-cache');
const prefsStore = createMmkvStore('islam-daily-prefs');

export const cache = makeNamespace(cacheStore);
export const prefs = makeNamespace(prefsStore);

export const CACHE_KEYS = {
  QURAN_FULL: 'quran:full:v1',
  QURAN_LAST_FETCHED: 'quran:lastFetched',
  HADITH_BOOK: (slug: string) => `hadith:book:${slug}:v1`,
  DAILY_KNOWLEDGE_LAST: 'dailyKnowledge:last',
  NAMES_99: 'names99:v1',
  DUAS: 'duas:v1',
  DHIKR: 'dhikr:v1',
} as const;

export const PREFS_KEYS = {
  PRAYER_TIMES_SETTINGS: 'prayer_times_settings',
  PRAYER_TIMES_FORMAT: 'prayer_times_format',
  PRAYER_TIMES_HIGH_LATITUDE_RULE: 'prayer_times_high_latitude_rule',
  QURAN_LAST_POSITION: 'quran_last_position',
  QURAN_LAST_POSITION_DISMISSED_UNTIL: 'quran_last_position_dismissed_until',
  PRAYER_NOTIFICATION_SETTINGS: 'prayer_notification_settings',
  NOTIFICATIONS_LAST_SCHEDULED_AT: 'notifications_last_scheduled_at',
} as const;
