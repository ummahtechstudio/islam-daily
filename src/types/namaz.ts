/**
 * Types for the Namaz & Masnoon Duas module.
 *
 * Bundled-only content (assets/data/namaz-core.json) — unlike content.ts,
 * which mirrors Supabase row shapes, this module never syncs remotely, so
 * the schema lives in its own file.
 *
 * Sourcing rules baked into the schema:
 *  - Quranic passages are NEVER stored as text here. `NamazQuranRef` carries
 *    only surah/ayah coordinates and is resolved at runtime from the bundled
 *    Tanzil dataset (services/quranCache.ts).
 *  - Every dua/recitation entry carries its own `source` line (hadith ref,
 *    "Hisn al-Muslim", or Quran citation).
 *  - Category 5 (daily-life duas) links to the existing duas-core.json by
 *    CATEGORY SLUG ONLY (`NamazDuaLink.duaCategoryId`) — per-dua keys are not
 *    stable across the Supabase cache refresh.
 */

// ─── Entries: recitations & Quran references ─────────────────────────────────

/** A dua/dhikr recitation authored with full harakat. */
export interface NamazRecitation {
  kind: 'recitation';
  /** Stable slug, e.g. "salah_thana". */
  id: string;
  title_en: string;
  title_ur: string;
  /** Arabic with full harakat. */
  arabic: string;
  transliteration: string;
  translation_en: string;
  translation_ur: string;
  /** e.g. "Abu Dawud 775", "Sahih Muslim 591", "Hisn al-Muslim". */
  source: string;
  /** Recommended repetitions (×3 tasbih etc.). */
  repeat?: number;
  note_en?: string;
  note_ur?: string;
  /** Reserved for future CDN audio; unused in v1. */
  audio_ref?: string;
}

/** A Quranic passage — coordinates only; text resolves from quranCache. */
export interface NamazQuranRef {
  kind: 'quran';
  id: string;
  title_en: string;
  title_ur: string;
  surah: number;
  /** Inclusive ayah range. */
  ayahStart: number;
  ayahEnd: number;
  /** e.g. "Quran 1:1-7". */
  source: string;
  repeat?: number;
  note_en?: string;
  note_ur?: string;
}

export type NamazEntry = NamazRecitation | NamazQuranRef;

// ─── Instructional sequences (wudu, how-to-pray, janazah…) ───────────────────

export interface NamazStep {
  id: string;
  title_en: string;
  title_ur: string;
  /** Position / action description. */
  body_en: string;
  body_ur: string;
  /** Marks obligatory acts (e.g. the four fara'id of wudu). */
  fard?: boolean;
  /** Slug ids into NamazContent.entries. */
  recitationIds?: string[];
  hanafiNote_en?: string;
  hanafiNote_ur?: string;
}

export interface NamazSequence {
  kind: 'sequence';
  id: string;
  title_en: string;
  title_ur: string;
  intro_en?: string;
  intro_ur?: string;
  /** Fiqh source line, e.g. "Hanafi fiqh". */
  source?: string;
  steps: NamazStep[];
}

// ─── Checklists (conditions, nullifiers, when-permitted) ─────────────────────

export interface NamazChecklistItem {
  id: string;
  text_en: string;
  text_ur: string;
  detail_en?: string;
  detail_ur?: string;
}

export interface NamazChecklist {
  kind: 'checklist';
  id: string;
  title_en: string;
  title_ur: string;
  source?: string;
  items: NamazChecklistItem[];
}

// ─── Reference table (rak'ah counts) ─────────────────────────────────────────

export interface NamazTable {
  kind: 'table';
  id: string;
  title_en: string;
  title_ur: string;
  columns: { key: string; label_en: string; label_ur: string }[];
  rows: { id: string; label_en: string; label_ur: string; cells: string[] }[];
  footnote_en?: string;
  footnote_ur?: string;
}

// ─── Category composition ────────────────────────────────────────────────────

/** Link card into an existing duas-core.json category (no duplication). */
export interface NamazDuaLink {
  kind: 'dua_link';
  id: string;
  /** Slug of a duas-core category, e.g. "waking". */
  duaCategoryId: string;
  title_en: string;
  title_ur: string;
}

/** Standalone entry placement inside a category's item list. */
export interface NamazEntryRef {
  kind: 'entry';
  entryId: string;
}

export type NamazItem =
  | NamazEntryRef
  | NamazSequence
  | NamazChecklist
  | NamazTable
  | NamazDuaLink;

export interface NamazCategory {
  id: string;
  icon: string;
  title_en: string;
  title_ur: string;
  items: NamazItem[];
}

export interface NamazContent {
  version: number;
  entries: NamazEntry[];
  categories: NamazCategory[];
}
