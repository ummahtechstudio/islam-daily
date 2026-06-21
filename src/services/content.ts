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
    // Only trust a snapshot at least as complete as the bundled set (100 rows)
    // that still contains the id=0 "Greatest Name" hero — a sparse remote
    // snapshot would otherwise drop the hero card from the grid.
    if (cached && cached.length >= NAMES_BUNDLED.length && cached.some((n) => n.id === 0)) {
      return cached;
    }
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
    // The remote table has no meaning_detail column; merge it back from the
    // bundled set by id so the cached snapshot keeps the extended descriptions.
    const detailById = new Map(NAMES_BUNDLED.map((n) => [n.id, n.meaning_detail] as const));
    const merged = (data as NameOfAllah[]).map((n) => ({
      ...n,
      meaning_detail: n.meaning_detail ?? detailById.get(n.id),
    }));
    cache.setJSON<NameOfAllah[]>(CACHE_KEYS.NAMES_99, merged);
  } catch {
    // bundled content is always available
  }
}

// ─── Duas (Hisn al-Muslim) ───────────────────────────────────────────────────

export function getBundledDuas(): DuaCategory[] {
  return DUAS_BUNDLED;
}

// A cached/remote snapshot is only trustworthy if it covers every bundled
// category with at least one dua. The bundled set is the verified baseline
// (102 duas / 18 categories); a partial remote table (e.g. the legacy 53-row
// pilot still in Supabase) would otherwise silently hide whole categories —
// Marriage, Sickness, Rizq, Friday — from the Duas tab while link cards and
// counts elsewhere are computed from the full bundled data.
function coversAllBundledCategories(cats: DuaCategory[]): boolean {
  const countById = new Map(cats.map((c) => [c.id, c.duas?.length ?? 0]));
  return DUAS_BUNDLED.every((b) => (countById.get(b.id) ?? 0) > 0);
}

export function getCachedOrBundledDuas(): DuaCategory[] {
  try {
    const cached = cache.getJSON<DuaCategory[]>(CACHE_KEYS.DUAS);
    // Guard at read time too: devices that already cached a stale partial
    // snapshot fall back to bundled even before the next refresh runs.
    if (cached && cached.length && coversAllBundledCategories(cached)) {
      return cached;
    }
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

    // Group flat rows into DuaCategory[] using the bundled category metadata as
    // a lookup: a row's own `title` is an individual dua's headline, NOT the
    // category name, so the category title must come from the bundled set.
    const iconByCat = new Map(DUAS_BUNDLED.map((c) => [c.id, c.icon] as const));
    const titleByCat = new Map(DUAS_BUNDLED.map((c) => [c.id, c.title] as const));
    const bundledByCat = new Map(DUAS_BUNDLED.map((c) => [c.id, c.duas] as const));
    const grouped = new Map<string, DuaCategory>();
    for (const row of data as unknown as SupabaseDuaRow[]) {
      let cat = grouped.get(row.category);
      if (!cat) {
        cat = {
          id: row.category,
          title: titleByCat.get(row.category) ?? row.category,
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
    const remote = Array.from(grouped.values());
    // Carry the bundled scan labels (title_en/title_ur — absent from the remote
    // table) across when a category's duas line up 1:1 with the bundled order.
    // On a count mismatch the order can't be trusted, so leave them unset rather
    // than mislabel a card.
    for (const cat of remote) {
      const bundled = bundledByCat.get(cat.id);
      if (bundled && bundled.length === cat.duas.length) {
        cat.duas.forEach((d, i) => {
          d.title_en = bundled[i].title_en;
          d.title_ur = bundled[i].title_ur;
        });
      }
    }
    // Refuse to cache a snapshot that is sparser than the bundled baseline —
    // it would downgrade verified content and empty out entire categories.
    if (!coversAllBundledCategories(remote)) return;
    cache.setJSON<DuaCategory[]>(CACHE_KEYS.DUAS, remote);
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
