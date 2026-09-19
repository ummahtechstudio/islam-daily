/**
 * Hadith of the Day — a deterministic daily pick over the hadith collections
 * ALREADY cached on this device (hadithCache / R2 "hadiths-v2" data). No hadith
 * text is bundled or typed in here; if no eligible collection is downloaded the
 * result is null and callers fall back to the generic "Daily Hadith" nudge.
 *
 * Pool rules:
 *  - Sahih al-Bukhari and Sahih Muslim: every record. The data carries no
 *    per-hadith gradings for the Sahihayn — the collection itself is the grade.
 *  - Jami at-Tirmidhi, Sunan Abu Dawud, Sunan Ibn Majah, Sunan an-Nasa'i,
 *    Muwatta Malik: only records where EVERY embedded grading (Al-Albani,
 *    Zubair Ali Zai, …) says sahih — and none says da'if or marks it as
 *    mawquf / maqtu' / mursal (a Companion's or Successor's statement, not a
 *    marfu' hadith of the Prophet).
 *  - The three "Forty Hadith" sets carry no gradings and are not Sahih
 *    collections, so they are excluded.
 *  - "Suited to a card": Arabic + English + Urdu all present, whole-number
 *    hadith number (no x.5 sub-narrations), English ≤ MAX_ENGLISH_CHARS. If
 *    that short pool is tiny the length cap is relaxed rather than returning
 *    nothing.
 *
 * Determinism: the pool is sorted by (collection order, hadith number) and the
 * index is an FNV-1a hash of the LOCAL calendar date. Everyone with the same
 * set of downloaded collections sees the same hadith on the same day, and it
 * rotates daily.
 */

import type { SupabaseHadith } from '../lib/supabase';
import type { HadithCollectionKey } from './hadiths';
import { getHadithBookFromCache } from './hadithCache';

export type HadithOfTheDay = {
  dateKey: string;
  hadith: SupabaseHadith;
  poolSize: number;
};

// Fixed order so the sort — and therefore the pick — is stable across devices.
const SAHIH_COLLECTIONS: HadithCollectionKey[] = ['bukhari', 'muslim'];
const GRADED_COLLECTIONS: HadithCollectionKey[] = ['tirmidhi', 'abudawud', 'ibnmajah', 'nasai', 'malik'];
const COLLECTION_ORDER: HadithCollectionKey[] = [...SAHIH_COLLECTIONS, ...GRADED_COLLECTIONS];

const MAX_ENGLISH_CHARS = 420;
const RELAXED_ENGLISH_CHARS = 900;
const MIN_SHORT_POOL = 40;

// Anything that disqualifies a "Sahih" grade string: weakness markers, and
// the non-Prophetic categories the graders label with a "Sahih" chain —
// mawquf (a Companion's statement), maqtu' (a Successor's) and mursal.
// "Hadith of the Day" is meant to be a marfu' hadith of the Prophet ﷺ.
const EXCLUDED_MARKERS = [
  'daif', "da'if", 'da’if', 'dhaif', 'weak', 'munkar', 'mawdu', 'batil', 'shadh', 'matruk',
  'mauquf', 'mawquf', 'muquf', 'maqtu', 'mursal',
];

export function isSahihGrade(grade: string): boolean {
  const g = grade.toLowerCase();
  if (!g.includes('sahih')) return false;
  return !EXCLUDED_MARKERS.some((w) => g.includes(w));
}

function isUnanimouslySahih(h: SupabaseHadith): boolean {
  return h.grades.length > 0 && h.grades.every((g) => isSahihGrade(g.grade));
}

function isCardSuitable(h: SupabaseHadith, maxEnglish: number): boolean {
  if (!h.arabic || !h.english || !h.urdu) return false;
  if (!/^\d+$/.test(h.hadith_number)) return false;
  return h.english.trim().length <= maxEnglish;
}

/** Local calendar date (not UTC) — a "day" is the user's day. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function buildPool(maxEnglish: number): { pool: SupabaseHadith[]; signature: string } {
  const pool: SupabaseHadith[] = [];
  const present: string[] = [];
  for (const slug of COLLECTION_ORDER) {
    const book = getHadithBookFromCache(slug);
    if (!book) continue;
    present.push(slug);
    const gradeOk = SAHIH_COLLECTIONS.includes(slug) ? () => true : isUnanimouslySahih;
    for (const h of book.hadiths) {
      if (gradeOk(h) && isCardSuitable(h, maxEnglish)) pool.push(h);
    }
  }
  pool.sort((a, b) => {
    const ca = COLLECTION_ORDER.indexOf(a.collection_key as HadithCollectionKey);
    const cb = COLLECTION_ORDER.indexOf(b.collection_key as HadithCollectionKey);
    if (ca !== cb) return ca - cb;
    return Number(a.hadith_number) - Number(b.hadith_number);
  });
  return { pool, signature: present.join(',') };
}

let memo: { key: string; value: HadithOfTheDay | null } | null = null;

/**
 * Bring every cached collection into memory ONE AT A TIME, yielding to the
 * event loop between books. getHadithBookFromCache JSON.parses a whole book
 * (up to ~20 MB) on a memory miss; a user with the full Offline pack has ~70 MB
 * of them, and doing that synchronously inside a screen's focus effect froze
 * the JS thread for seconds at launch. After this, getHadithOfTheDay() is a
 * cheap memo/Map hit for the rest of the session.
 */
export async function warmHadithOfTheDayPool(isCancelled: () => boolean = () => false): Promise<void> {
  for (const slug of COLLECTION_ORDER) {
    if (isCancelled()) return;
    getHadithBookFromCache(slug);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Today's hadith, or null when no eligible collection is cached on-device.
 * Memoised per (date, set of cached collections).
 */
export function getHadithOfTheDay(now: Date = new Date()): HadithOfTheDay | null {
  const dateKey = localDateKey(now);
  // Cheap pre-check of which books exist so the memo key is right even before
  // the (memoised) pool is rebuilt.
  const signature = COLLECTION_ORDER.filter((s) => !!getHadithBookFromCache(s)).join(',');
  const key = `${dateKey}|${signature}`;
  if (memo && memo.key === key) return memo.value;

  let { pool } = buildPool(MAX_ENGLISH_CHARS);
  if (pool.length < MIN_SHORT_POOL) {
    const relaxed = buildPool(RELAXED_ENGLISH_CHARS).pool;
    if (relaxed.length > pool.length) pool = relaxed;
  }

  const value: HadithOfTheDay | null =
    pool.length === 0
      ? null
      : { dateKey, hadith: pool[fnv1a(dateKey) % pool.length], poolSize: pool.length };
  memo = { key, value };
  return value;
}
