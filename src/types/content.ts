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

  // Short bilingual labels shown on each dua card so users can scan by
  // purpose. Authored from each dua's english + reference + category.
  // Always present in the bundled JSON.
  title_en?: string;
  title_ur?: string;

  // Phase D.1 — populated from Supabase, absent in bundled JSON.
  // `id` is the integer primary key from public.duas (used by import scripts
  // to bind a CSV row back to its DB row).
  id?: number;
  description_ur?: string | null;
  description_source?: string | null;
}

/**
 * One row of public.daily_knowledge — hand-curated daily reflections.
 */
export interface DailyKnowledge {
  id: string;
  display_date: string; // ISO date "2026-05-03"
  type: 'ayah' | 'hadith' | 'reflection' | 'name_of_allah';
  arabic_text?: string | null;
  source_reference?: string | null;
  translation_ur?: string | null;
  translation_en?: string | null;
  context_ur?: string | null;
  context_en?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
