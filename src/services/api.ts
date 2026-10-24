import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithTimeout } from '../utils/network';
import { getQuranFromCache, type AyahLite } from './quranCache';
import { buildBundledSurah, bundledFallbackEdition } from './quranBundled';
import { SURAH_META } from '../constants/surahMeta';

const QURAN_BASE = 'https://api.alquran.cloud/v1';

// Single source of truth for timeouts so all third-party calls behave the same
// on flaky networks. 15 s matches network.ts's default and is the upper bound
// before the spinner-of-doom UX problem kicks in.
const NET_TIMEOUT_MS = 15000;

// ─── Generic cache helper ────────────────────────────────────────────────────

// In-memory cooldown so a flaky-network refresh doesn't stampede the same
// upstream endpoint dozens of times in a few seconds. Doesn't persist;
// per-process by design.
const FAILURE_COOLDOWN_MS = 30 * 1000;
const recentFailures = new Map<string, number>();

async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 6 * 60 * 60 * 1000 // 6 h default
): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < ttlMs) return data as T;
    }
  } catch (err) {
    if (__DEV__) console.warn('[api] cached parse failed for', key, err);
  }

  const lastFailedAt = recentFailures.get(key) ?? 0;
  if (Date.now() - lastFailedAt < FAILURE_COOLDOWN_MS) {
    throw new Error('Network call recently failed; cooling down');
  }

  try {
    const data = await fetcher();
    recentFailures.delete(key);
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch {}
    return data;
  } catch (e) {
    recentFailures.set(key, Date.now());
    throw e;
  }
}

// Builds before 828ef8f cached the Aladhan Qibla response under
// `api_qibla_<lat>_<lng>` (2-dp coordinates, on-device only). The call is
// gone, so remove the orphans at launch rather than waiting for the user to
// press Settings → Clear Cache (which now sweeps `api_*` too). Safe to call
// every launch: it's a no-op once the keys are gone.
export async function purgeLegacyQiblaCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) => k.startsWith('api_qibla_'));
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {
    // Housekeeping only — never surface.
  }
}

async function safeJson(res: Response): Promise<any> {
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  try {
    return await res.json();
  } catch {
    throw new Error('Malformed response');
  }
}

// ─── Quran ───────────────────────────────────────────────────────────────────

export async function fetchSurahList() {
  return cachedFetch('api_surah_list', async () => {
    const res = await fetchWithTimeout(`${QURAN_BASE}/surah`, {}, NET_TIMEOUT_MS);
    const json = await safeJson(res);
    if (json.code !== 200) throw new Error('Quran API error');
    return json.data as SurahMeta[];
  }, 24 * 60 * 60 * 1000);
}

export async function fetchSurah(
  number: number,
  translation = 'ur.jalandhry'
) {
  // NOTE: the old "Quran Text" download pack (offline_surah_N) is deliberately
  // not consulted: it stored one fixed English edition, and serving it here
  // would label that text as whatever edition was requested. The whole Quran
  // (Arabic + Jalandhri + Asad) is bundled — see services/quranBundled.

  // Cache key includes translation so switching languages fetches fresh data
  return cachedFetch(`api_surah_${number}_${translation}`, async () => {
    const res = await fetchWithTimeout(
      `${QURAN_BASE}/surah/${number}/editions/quran-uthmani,${translation}`,
      {},
      NET_TIMEOUT_MS,
    );
    const json = await safeJson(res);
    if (json.code !== 200) throw new Error('Quran API error');
    return json.data as [SurahEdition, SurahEdition];
  }, 7 * 24 * 60 * 60 * 1000);
}

// The Verse of the Day is a Quran verse, so its translation follows the user's
// Quran translation edition (settings.selectedTranslation — the reader's edition
// picker), NOT the dua/dhikr language toggle. The edition is passed straight to
// fetchSurah and echoed back so the caller can resolve its direction/font via
// findTranslation().
export async function fetchRandomVerse(edition: string = 'ur.jalandhry') {
  // Deterministic per local calendar day: same verse for every user on the same day,
  // rotates at local midnight.
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const surahNum = (dayOfYear % 114) + 1;
  // Bundled editions need no network at all. Any other edition is fetched; if
  // that fails (offline), fall back to a bundled translation and echo ITS
  // edition so the card labels it truthfully.
  let shownEdition = edition;
  let data: [SurahEdition, SurahEdition] | null = null;
  const bundled = buildBundledSurah(surahNum, edition);
  if (bundled?.translation) {
    data = [bundled.arabic, bundled.translation];
  } else {
    try {
      data = await fetchSurah(surahNum, edition);
    } catch (err) {
      shownEdition = bundledFallbackEdition(edition);
      const fb = buildBundledSurah(surahNum, shownEdition);
      if (!fb?.translation) throw err;
      data = [fb.arabic, fb.translation];
    }
  }
  // Guard the destructure: a malformed offline/cached pack could have a missing
  // element 0, which would throw on `.englishName` / `.ayahs` below.
  const arabic = data?.[0];
  const translationEd = data?.[1];
  // Clamp to the shorter edition: an offline/cached pack could in principle
  // hold a translation edition with a different ayah count than the Arabic one,
  // and indexing past its end would throw "undefined is not an object".
  const arabicAyahs = arabic?.ayahs ?? [];
  const translationAyahs = translationEd?.ayahs ?? [];
  let verseIdx = arabicAyahs.length > 0 ? dayOfYear % arabicAyahs.length : 0;
  // Surah Al-Fatiha counts the Basmala as ayah 1; skip ayah[0] so the verse of
  // the day is never just the Basmala shown out of context.
  if (surahNum === 1 && arabicAyahs.length > 1) {
    verseIdx = 1 + (dayOfYear % (arabicAyahs.length - 1));
  }
  const arabicAyah = arabicAyahs[verseIdx];
  const translationAyah = translationAyahs[verseIdx];
  return {
    surahName: arabic?.englishName ?? '',
    surahNumber: surahNum,
    verseNumber: arabicAyah?.numberInSurah ?? verseIdx + 1,
    arabic: arabicAyah?.text ?? '',
    translation: translationAyah?.text ?? '',
    edition: shownEdition,
  };
}

// ─── Hadith ───────────────────────────────────────────────────────────────────

export async function fetchRandomHadith() {
  // Use a small curated list for "hadith of the day" without requiring an API key
  const hadiths: { arabic: string; english: string; urdu: string; narrator: string; reference: string }[] = [
    {
      arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
      english: 'Actions are judged by intentions.',
      urdu: 'اعمال کا دارومدار نیتوں پر ہے۔',
      narrator: 'Umar ibn al-Khattab (RA)',
      reference: 'Bukhari 1, Muslim 1907',
    },
    {
      arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
      english: 'A Muslim is the one from whose tongue and hand other Muslims are safe.',
      urdu: 'مسلمان وہ ہے جس کی زبان اور ہاتھ سے دوسرے مسلمان محفوظ رہیں۔',
      narrator: 'Abdullah ibn Amr (RA)',
      reference: 'Bukhari 10, Muslim 40',
    },
    {
      arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
      english: 'None of you truly believes until he loves for his brother what he loves for himself.',
      urdu: 'تم میں سے کوئی مومن نہیں ہو سکتا جب تک اپنے بھائی کے لیے وہی نہ چاہے جو اپنے لیے چاہتا ہے۔',
      narrator: 'Anas ibn Malik (RA)',
      reference: 'Bukhari 13, Muslim 45',
    },
    {
      arabic: 'أَفْضَلُ الصِّيَامِ بَعْدَ رَمَضَانَ شَهْرُ اللَّهِ الْمُحَرَّمُ',
      english: 'The best fasting after Ramadan is fasting in the month of Allah, Muharram.',
      urdu: 'رمضان کے بعد سب سے افضل روزہ اللہ کے مہینے محرم کا روزہ ہے۔',
      narrator: 'Abu Hurairah (RA)',
      reference: 'Muslim 1163',
    },
    {
      arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
      english: 'The best among you are those who learn the Quran and teach it.',
      urdu: 'تم میں سے بہترین وہ ہے جو قرآن سیکھے اور دوسروں کو سکھائے۔',
      narrator: 'Uthman ibn Affan (RA)',
      reference: 'Bukhari 5027',
    },
    {
      arabic: 'الطَّهُورُ شَطْرُ الإِيمَانِ',
      english: 'Cleanliness is half of faith.',
      urdu: 'پاکیزگی نصف ایمان ہے۔',
      narrator: 'Abu Malik al-Ashari (RA)',
      reference: 'Muslim 223',
    },
    {
      arabic: 'أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ',
      english: 'The most beloved deeds to Allah are those done consistently, even if small.',
      urdu: 'اللہ کو سب سے زیادہ محبوب وہ اعمال ہیں جو ہمیشہ کیے جائیں اگرچہ تھوڑے ہی ہوں۔',
      narrator: 'Aisha (RA)',
      reference: 'Bukhari 6465, Muslim 783',
    },
  ];
  // Day-of-year mod length so all entries are seen across a 365-day cycle,
  // not just three out of every eight per month.
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const idx = ((dayOfYear % hadiths.length) + hadiths.length) % hadiths.length;
  return hadiths[idx];
}

// ─── Islamic Search (client-side across Quran) ────────────────────────────────

// Offline fallback: substring-scan the bundled Quran's English translation so
// search still works without a network (the full Quran ships locally). Mirrors
// the remote en.asad behaviour closely enough; results are capped to keep the
// list bounded.
// ─── Quran search (on-device) ─────────────────────────────────────────────────
// The whole Quran ships with the app (Arabic, Urdu Jalandhri, English Asad), so
// search runs locally: instant, offline, and in the language the user types.
// (The old online search only covered English, so every Urdu query — including
// the Urdu suggestion chips — returned "no results".)

// Harakat, Quranic annotation marks, tatweel and invisible joiners.
const AR_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200C-\u200F\uFEFF]/g;
const ARABIC_SCRIPT = /[\u0600-\u06FF]/;

/** Folds the letter variants Arabic and Urdu spell differently so either matches. */
export function normaliseArabicScript(s: string): string {
  return s
    .replace(AR_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىیيېےۓئ]/g, 'ي')
    .replace(/[ةۃہھۀ]/g, 'ه')
    .replace(/ک/g, 'ك')
    .replace(/ؤ/g, 'و')
    .replace(/\s+/g, ' ')
    .trim();
}

type SearchRow = { a: AyahLite; surah: (typeof SURAH_META)[number]; ur: string; ar: string; en: string };
let searchRows: SearchRow[] | null = null;
function getSearchRows(): SearchRow[] {
  if (searchRows) return searchRows;
  const idx = getQuranFromCache();
  const rows: SearchRow[] = [];
  for (const surah of SURAH_META) {
    for (const a of idx?.bySurah[surah.number] ?? []) {
      rows.push({
        a,
        surah,
        ur: normaliseArabicScript(a.translation_ur ?? ''),
        ar: normaliseArabicScript(a.text_arabic ?? ''),
        en: (a.translation_en ?? '').toLowerCase(),
      });
    }
  }
  searchRows = rows;
  return rows;
}

const SEARCH_LIMIT = 200;

function searchBundledQuran(query: string): QuranSearchResult[] {
  const raw = query.trim();
  if (!raw) return [];
  const arabicScript = ARABIC_SCRIPT.test(raw);
  const q = arabicScript ? normaliseArabicScript(raw) : raw.toLowerCase();
  if (!q) return [];
  const results: QuranSearchResult[] = [];
  for (const row of getSearchRows()) {
    let text: string | null = null;
    let edition = { identifier: 'en.asad', language: 'en' };
    if (arabicScript) {
      if (row.ur.includes(q)) {
        text = row.a.translation_ur ?? '';
        edition = { identifier: 'ur.jalandhry', language: 'ur' };
      } else if (row.ar.includes(q)) {
        text = row.a.text_arabic ?? '';
        edition = { identifier: 'quran-uthmani', language: 'ar' };
      }
    } else if (row.en.includes(q)) {
      text = row.a.translation_en ?? '';
    }
    if (text === null) continue;
    results.push({
      // Unique global ayah number (surah×1000 + ayah) for the list's keyExtractor.
      number: row.surah.number * 1000 + row.a.ayah,
      text,
      edition,
      surah: { number: row.surah.number, name: row.surah.name_arabic, englishName: row.surah.name_english },
      numberInSurah: row.a.ayah,
    });
    if (results.length >= SEARCH_LIMIT) break;
  }
  return results;
}

export async function searchQuran(query: string): Promise<QuranSearchResult[]> {
  return searchBundledQuran(query);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
}

export interface SurahEdition {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: Ayah[];
  edition: { identifier: string; language: string; name: string };
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  [key: string]: string;
}

export interface HijriDate {
  date: string;
  format: string;
  day: string;
  weekday: { en: string; ar: string };
  month: { number: number; en: string; ar: string };
  year: string;
  holidays: string[];
}

export interface QuranSearchResult {
  number: number;
  text: string;
  edition: { identifier: string; language: string };
  surah: { number: number; name: string; englishName: string };
  numberInSurah: number;
}
