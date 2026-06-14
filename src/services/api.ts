import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithTimeout } from '../utils/network';

const QURAN_BASE = 'https://api.alquran.cloud/v1';
const ALADHAN_BASE = 'https://api.aladhan.com/v1';

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
  // Offline download pack (stored without translation suffix — language-agnostic pack)
  try {
    const offlineRaw = await AsyncStorage.getItem(`offline_surah_${number}`);
    if (offlineRaw) return JSON.parse(offlineRaw) as [SurahEdition, SurahEdition];
  } catch {}

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

export async function fetchRandomVerse() {
  // Deterministic per local calendar day: same verse for every user on the same day,
  // rotates at local midnight.
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const surahNum = (dayOfYear % 114) + 1;
  const data = await fetchSurah(surahNum);
  const [arabic, english] = data;
  // Clamp to the shorter edition: an offline/cached pack could in principle
  // hold a translation edition with a different ayah count than the Arabic one,
  // and indexing past its end would throw "undefined is not an object".
  const arabicAyahs = arabic?.ayahs ?? [];
  const englishAyahs = english?.ayahs ?? [];
  const verseIdx = arabicAyahs.length > 0 ? dayOfYear % arabicAyahs.length : 0;
  const arabicAyah = arabicAyahs[verseIdx];
  const englishAyah = englishAyahs[verseIdx];
  return {
    surahName: arabic.englishName,
    surahNumber: surahNum,
    verseNumber: arabicAyah?.numberInSurah ?? verseIdx + 1,
    arabic: arabicAyah?.text ?? '',
    english: englishAyah?.text ?? '',
  };
}

// ─── Qibla ────────────────────────────────────────────────────────────────────

export async function fetchQiblaDirection(latitude: number, longitude: number) {
  const key = `api_qibla_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
  return cachedFetch(key, async () => {
    const res = await fetchWithTimeout(
      `${ALADHAN_BASE}/qibla/${latitude}/${longitude}`,
      {},
      NET_TIMEOUT_MS,
    );
    const json = await safeJson(res);
    if (json.code !== 200) throw new Error('Qibla API error');
    return json.data as { latitude: number; longitude: number; direction: number };
  }, 30 * 24 * 60 * 60 * 1000);
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

export async function searchQuran(query: string) {
  const res = await fetchWithTimeout(
    `${QURAN_BASE}/search/${encodeURIComponent(query)}/all/en.asad`,
    {},
    NET_TIMEOUT_MS,
  );
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  if (!json || json.code !== 200) return [];
  return (json.data?.matches ?? []) as QuranSearchResult[];
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
