/**
 * Content layer for small static datasets bundled with the app.
 *
 * Read order (sync, no spinner):
 *   1. MMKV cache (most-recent Supabase snapshot, if any)
 *   2. Bundled JSON in `assets/data/`  (always present)
 *
 * Background refresh (silent, fire-and-forget): pulls the canonical Supabase
 * row and updates the cache. Failures are swallowed — bundled content
 * guarantees the screen always renders.
 */

import { supabase } from '../lib/supabase';
import { CACHE_KEYS, cache } from '../lib/storage';
import type {
  DhikrCategory,
  DuaCategory,
  NameOfAllah,
} from '../types/content';

import bundledNames from '../../assets/data/names99.json';
import bundledDuas from '../../assets/data/duas-core.json';
import bundledDhikr from '../../assets/data/dhikr-core.json';

const NAMES_BUNDLED = bundledNames as NameOfAllah[];
const DUAS_BUNDLED = bundledDuas as DuaCategory[];
const DHIKR_BUNDLED = bundledDhikr as DhikrCategory[];

// ─── 99 Names of Allah ───────────────────────────────────────────────────────

// Sync, SSR-safe. Returns bundled JSON only — never touches storage.
// Use as a useState lazy initialiser so the first render works on web SSR.
export function getBundledNamesOfAllah(): NameOfAllah[] {
  return NAMES_BUNDLED;
}

// Reads the MMKV cache if present, else falls back to bundled.
// MUST be called from useEffect (client-only) — storage is unavailable on SSR.
export function getCachedOrBundledNamesOfAllah(): NameOfAllah[] {
  try {
    const cached = cache.getJSON<NameOfAllah[]>(CACHE_KEYS.NAMES_99);
    if (cached && cached.length) return cached;
  } catch { /* storage not ready -> fall through */ }
  return NAMES_BUNDLED;
}

export async function refreshNamesOfAllah(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('names_of_allah')
      .select('id, number, arabic, transliteration, english_meaning, urdu_meaning, quran_reference, dua')
      .order('id');
    if (error || !data?.length) return;
    cache.setJSON<NameOfAllah[]>(CACHE_KEYS.NAMES_99, data as NameOfAllah[]);
  } catch {
    // bundled content is always available
  }
}

// ─── Duas (Hisn al-Muslim) ───────────────────────────────────────────────────

export function getBundledDuas(): DuaCategory[] {
  return DUAS_BUNDLED;
}

export function getCachedOrBundledDuas(): DuaCategory[] {
  try {
    const cached = cache.getJSON<DuaCategory[]>(CACHE_KEYS.DUAS);
    if (cached && cached.length) return cached;
  } catch { /* storage not ready -> fall through */ }
  return DUAS_BUNDLED;
}

interface SupabaseDuaRow {
  id: number;
  category: string;
  title: string;
  arabic: string;
  transliteration: string | null;
  urdu: string | null;
  english: string;
  source: string | null;
  description_ur: string | null;
  description_source: string | null;
}

export async function refreshDuas(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('duas')
      .select(
        'id, category, title, arabic, transliteration, urdu, english, source, description_ur, description_source',
      )
      .order('id');
    if (error || !data?.length) return;

    // Group flat rows into DuaCategory[] using the bundled icons as a lookup.
    const iconByCat = new Map(DUAS_BUNDLED.map((c) => [c.id, c.icon] as const));
    const grouped = new Map<string, DuaCategory>();
    for (const row of data as unknown as SupabaseDuaRow[]) {
      let cat = grouped.get(row.category);
      if (!cat) {
        cat = {
          id: row.category,
          title: row.title,
          icon: iconByCat.get(row.category) ?? '',
          duas: [],
        };
        grouped.set(row.category, cat);
      }
      cat.duas.push({
        id: row.id,
        arabic: row.arabic,
        transliteration: row.transliteration ?? '',
        english: row.english,
        urdu: row.urdu ?? undefined,
        reference: row.source ?? '',
        description_ur: row.description_ur,
        description_source: row.description_source,
      });
    }
    cache.setJSON<DuaCategory[]>(CACHE_KEYS.DUAS, Array.from(grouped.values()));
  } catch {
    // bundled content is always available
  }
}

// ─── Dhikr ───────────────────────────────────────────────────────────────────

export function getBundledDhikr(): DhikrCategory[] {
  return DHIKR_BUNDLED;
}

export function getCachedOrBundledDhikr(): DhikrCategory[] {
  try {
    const cached = cache.getJSON<DhikrCategory[]>(CACHE_KEYS.DHIKR);
    if (cached && cached.length) return cached;
  } catch { /* storage not ready -> fall through */ }
  return DHIKR_BUNDLED;
}

/**
 * No-op refresh: there is no Supabase `dhikr` table yet.
 * Kept for parity with names/duas so the startup wiring is uniform.
 */
export async function refreshDhikr(): Promise<void> {
  return;
}
