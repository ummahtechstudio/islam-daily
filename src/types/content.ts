/**
 * Strict types for bundled static content under `assets/data/`.
 * Mirrors Supabase shapes for `names_of_allah` and `duas`; Dhikr has no
 * Supabase table and is bundled-only.
 */

export interface NameOfAllah {
  id: number;
  number: number;
  arabic: string;
  transliteration: string;
  english_meaning: string;
  urdu_meaning: string | null;
  quran_reference: string | null;
  /** Optional extended description (only present in bundled JSON) */
  meaning_detail?: string;
  /** Optional dua text from Supabase column */
  dua?: string | null;
}

export interface Dua {
  arabic: string;
  transliteration: string;
  english: string;
  urdu?: string;
  reference: string;
}

export interface DuaCategory {
  id: string;
  title: string;
  icon: string;
  duas: Dua[];
}

export interface DhikrItem {
  arabic: string;
  transliteration: string;
  english: string;
  urdu?: string;
  count: number;
  benefit: string;
  reference: string;
}

export interface DhikrCategory {
  id: string;
  title: string;
  icon: string;
  items: DhikrItem[];
}
