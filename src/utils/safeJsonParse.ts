/**
 * JSON.parse that returns a fallback instead of throwing.
 *
 * Use this for values read from MMKV / AsyncStorage where a corrupted entry
 * (partial write, schema drift, manual debug poke) shouldn't crash the
 * screen. The caller decides what "empty" means via `fallback`.
 *
 * When parsing fails, the corrupt raw value is logged once so we can spot
 * it in dev without scaring users with a red-box.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    if (__DEV__) {
      console.warn('[safeJsonParse] dropping corrupt value:', err);
    }
    return fallback;
  }
}
