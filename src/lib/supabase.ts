import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vchfykblowmrcvyaljxn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_B9WZesatOJ4wZc1ex3Gscg_2_CtEr1C';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Table types ──────────────────────────────────────────────────────────────

export interface QuranAyah {
  id: number;
  surah_number: number;
  ayah_number: number;
  arabic_text: string;
  urdu_translation: string | null;
  english_translation: string | null;
  juz: number | null;
  page: number | null;
  text_indopak?: string;
  page_indopak?: number;
}

export interface HadithGrade {
  name: string;
  grade: string;
}

export interface SupabaseHadith {
  id: number;
  collection_key: string;
  collection_name: string;
  book_id: number | null;
  book_name: string | null;
  chapter_id: number | null;
  chapter_name: string | null;
  hadith_number: string;
  arabic: string | null;
  english: string | null;
  urdu: string | null;
  grades: HadithGrade[];
}

export interface SupabaseDua {
  id: number;
  category: string;
  title: string;
  arabic: string;
  transliteration: string | null;
  urdu: string | null;
  english: string;
  source: string | null;
  audio_url: string | null;
}

export interface SupabaseName {
  id: number;
  number: number;
  arabic: string;
  transliteration: string;
  english_meaning: string;
  urdu_meaning: string | null;
  quran_reference: string | null;
  dua: string | null;
}

export interface UserBookmark {
  id: string;
  user_id: string;
  type: 'quran' | 'hadith' | 'dua';
  reference_id: string;
  note: string | null;
  created_at: string;
}

export interface PrayerStreak {
  id: string;
  user_id: string;
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

export interface HifzProgress {
  id: string;
  user_id: string;
  surah_number: number;
  memorized: boolean;
  last_revised: string | null;
}
