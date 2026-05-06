import AsyncStorage from '@react-native-async-storage/async-storage';

const QURAN_BASE = 'https://api.alquran.cloud/v1';
const ALADHAN_BASE = 'https://api.aladhan.com/v1';

// ─── Generic cache helper ────────────────────────────────────────────────────

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
  } catch {}

  const data = await fetcher();
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
  return data;
}

// ─── Quran ───────────────────────────────────────────────────────────────────

export async function fetchSurahList() {
  return cachedFetch('api_surah_list', async () => {
    const res = await fetch(`${QURAN_BASE}/surah`);
    const json = await res.json();
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
    const res = await fetch(
      `${QURAN_BASE}/surah/${number}/editions/quran-uthmani,${translation}`
    );
    const json = await res.json();
    if (json.code !== 200) throw new Error('Quran API error');
    return json.data as [SurahEdition, SurahEdition];
  }, 7 * 24 * 60 * 60 * 1000);
}

export async function fetchRandomVerse() {
  const surahNum = Math.floor(Math.random() * 114) + 1;
  const data = await fetchSurah(surahNum);
  const [arabic, english] = data;
  const verseIdx = Math.floor(Math.random() * arabic.ayahs.length);
  return {
    surahName: arabic.englishName,
    surahNumber: surahNum,
    verseNumber: arabic.ayahs[verseIdx].numberInSurah,
    arabic: arabic.ayahs[verseIdx].text,
    english: english.ayahs[verseIdx].text,
  };
}

// ─── Prayer Times ─────────────────────────────────────────────────────────────

export async function fetchPrayerTimes(
  latitude: number,
  longitude: number,
  method = 4
) {
  const today = new Date();
  const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
  const key = `api_prayers_${latitude.toFixed(2)}_${longitude.toFixed(2)}_${dateStr}`;

  return cachedFetch(key, async () => {
    const url = `${ALADHAN_BASE}/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.code !== 200) throw new Error('Prayer API error');
    return json.data as PrayerTimesData;
  }, 60 * 60 * 1000); // 1 h
}

export async function fetchQiblaDirection(latitude: number, longitude: number) {
  const key = `api_qibla_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
  return cachedFetch(key, async () => {
    const res = await fetch(`${ALADHAN_BASE}/qibla/${latitude}/${longitude}`);
    const json = await res.json();
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
  const idx = new Date().getDate() % hadiths.length;
  return hadiths[idx];
}

// ─── Islamic Search (client-side across Quran) ────────────────────────────────

export async function searchQuran(query: string) {
  const res = await fetch(
    `${QURAN_BASE}/search/${encodeURIComponent(query)}/all/en.asad`
  );
  const json = await res.json();
  if (json.code !== 200) return [];
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

export interface PrayerTimesData {
  timings: PrayerTimes;
  date: {
    readable: string;
    timestamp: string;
    hijri: HijriDate;
    gregorian: { date: string; format: string; day: string; weekday: { en: string }; month: { number: number; en: string }; year: string };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: { id: number; name: string };
    latitudeAdjustmentMethod: string;
  };
}

export interface QuranSearchResult {
  number: number;
  text: string;
  edition: { identifier: string; language: string };
  surah: { number: number; name: string; englishName: string };
  numberInSurah: number;
}
