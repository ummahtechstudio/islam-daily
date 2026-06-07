/**
 * Namaz & Masnoon Duas content access.
 *
 * Bundled-only (assets/data/namaz-core.json) — no Supabase table, no MMKV
 * cache. Mirrors the dhikr pattern in services/content.ts: synchronous,
 * offline-safe, available the moment the JS bundle loads.
 *
 * Quranic passages are never stored in the namaz JSON; `resolveQuranRef`
 * pulls them from the bundled Tanzil dataset at runtime (quranCache).
 */

import { getAyahsForSurah, type AyahLite } from './quranCache';
import type {
  NamazCategory,
  NamazContent,
  NamazEntry,
  NamazQuranRef,
  NamazSequence,
} from '../types/namaz';

export function getNamazContent(): NamazContent {
  return require('../../assets/data/namaz-core.json') as NamazContent;
}

export function getNamazCategories(): NamazCategory[] {
  return getNamazContent().categories;
}

export function getNamazCategory(id: string): NamazCategory | undefined {
  return getNamazContent().categories.find((c) => c.id === id);
}

// Memoized slug → entry map; the entries array never changes at runtime.
let entryMap: Map<string, NamazEntry> | null = null;

export function getNamazEntry(id: string): NamazEntry | undefined {
  if (!entryMap) {
    entryMap = new Map(getNamazContent().entries.map((e) => [e.id, e]));
  }
  return entryMap.get(id);
}

/** The single guided-walkthrough sequence inside the how_to_pray category. */
export function getHowToPraySequence(): NamazSequence | undefined {
  const cat = getNamazCategory('how_to_pray');
  const seq = cat?.items.find((i) => i.kind === 'sequence');
  return seq?.kind === 'sequence' ? seq : undefined;
}

export type ResolvedQuranRef = {
  /** Joined Arabic text (Tanzil Uthmani preferred, Indo-Pak fallback). */
  arabic: string;
  /** The individual ayahs, for per-ayah audio range playback. */
  ayahs: AyahLite[];
  translation_en: string;
  translation_ur: string;
};

/**
 * Resolve a Quran-ref entry from the bundled Tanzil dataset. Never falls
 * back to hand-typed text — if the range is somehow invalid the fields come
 * back empty and the card renders nothing rather than wrong text.
 */
export function resolveQuranRef(entry: NamazQuranRef): ResolvedQuranRef {
  const ayahs = getAyahsForSurah(entry.surah).filter(
    (a) => a.ayah >= entry.ayahStart && a.ayah <= entry.ayahEnd,
  );
  return {
    arabic: ayahs.map((a) => a.text_arabic || a.text_indopak).join(' '),
    ayahs,
    translation_en: ayahs
      .map((a) => a.translation_en)
      .filter(Boolean)
      .join(' '),
    translation_ur: ayahs
      .map((a) => a.translation_ur)
      .filter(Boolean)
      .join(' '),
  };
}
