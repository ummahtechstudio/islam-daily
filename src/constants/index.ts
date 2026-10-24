export * from './colors';
export * from './fonts';
export * from './typography';
export * from './spacing';

export const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const PRAYER_ICONS = ['🌙', '🌅', '☀️', '🌤️', '🌇', '⭐'];

// name = English proper noun; name_ur = the name Urdu readers use.
export const HADITH_COLLECTIONS = [
  { key: 'bukhari',  name: 'Sahih Bukhari', name_ur: 'صحیح بخاری' },
  { key: 'muslim',   name: 'Sahih Muslim', name_ur: 'صحیح مسلم' },
  { key: 'tirmidhi', name: 'Jami at-Tirmidhi', name_ur: 'جامع ترمذی' },
  { key: 'abudawud', name: 'Sunan Abu Dawud', name_ur: 'سنن ابو داؤد' },
  { key: 'ibnmajah', name: 'Sunan Ibn Majah', name_ur: 'سنن ابن ماجہ' },
  { key: 'nasai',    name: "Sunan an-Nasa'i", name_ur: 'سنن نسائی' },
  { key: 'malik',    name: 'Muwatta Malik', name_ur: 'مؤطا امام مالک' },
  { key: 'nawawi',   name: 'Forty Hadith of an-Nawawi', name_ur: 'اربعینِ نووی' },
  { key: 'qudsi',    name: 'Forty Hadith Qudsi', name_ur: 'اربعین قدسی' },
  { key: 'dehlawi',  name: 'Forty Hadith of Shah Waliullah Dehlawi', name_ur: 'اربعین دہلوی' },
];

/** Collection name in the current UI language (Urdu UI → Urdu name). */
export function hadithCollectionName(key: string, lang: string, fallback = ''): string {
  const c = HADITH_COLLECTIONS.find((x) => x.key === key);
  if (!c) return fallback;
  return lang === 'ur' ? c.name_ur : c.name;
}

export const MAKKAH_COORDS = { latitude: 21.4225, longitude: 39.8262 };

export const CACHE_KEYS = {
  prayerTimes: 'cache_prayer_times',
  verseOfDay: 'cache_verse_of_day',
  hadithOfDay: 'cache_hadith_of_day',
  quranSurahList: 'cache_quran_surah_list',
  names99: 'cache_99_names',
  settings: 'settings',
  location: 'last_location',
  hifzProgress: 'hifz_progress',
  prayerStreak: 'prayer_streak',
  customAdhan: 'custom_adhan',
};

export const SURAH_COUNT = 114;

export const RECITERS = [
  { id: 'ar.alafasy',             name: 'Mishary Alafasy' },
  { id: 'ar.abdulbasitmurattal',  name: 'Abdul Basit (Murattal)' },
  { id: 'ar.mahermuaiqly',        name: 'Maher Al-Muaiqly' },
  { id: 'ar.sudais',              name: 'Abdurrahman Al-Sudais' },
  { id: 'ar.minshawi',            name: 'Minshawi (Murattal)' },
] as const;

export const ADHAN_SOUNDS = [
  { id: 'makkah',      name: 'Makkah',      url: 'https://islamicfinder.org/sounds/azan/makkah_athan.mp3' },
  { id: 'madinah',     name: 'Madinah',     url: 'https://islamicfinder.org/sounds/azan/madinah_athan.mp3' },
  { id: 'mishary',     name: 'Mishary',     url: 'https://islamicfinder.org/sounds/azan/mishary_athan.mp3' },
  { id: 'abdulbasit',  name: 'Abdul Basit', url: 'https://islamicfinder.org/sounds/azan/abdulbasit_athan.mp3' },
  { id: 'egyptian',    name: 'Egyptian',    url: 'https://islamicfinder.org/sounds/azan/egyptian_athan.mp3' },
] as const;

export const PRAYER_LIST = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export const ISLAMIC_BOOKS = [
  {
    title: 'Riyad as-Salihin',
    author: 'Imam an-Nawawi',
    description: 'Gardens of the Righteous — a compilation of Quranic verses and hadiths',
    url: 'https://archive.org/download/riyad-as-salihin/riyad-as-salihin.pdf',
    icon: '📗',
    color: '#22C55E',
  },
  {
    title: 'Bulugh al-Maram',
    author: 'Ibn Hajar al-Asqalani',
    description: 'Attainment of the Objective — hadiths on Islamic jurisprudence',
    url: 'https://archive.org/download/BulughAlMaramByIbnHajar/BulughAlMaram.pdf',
    icon: '📘',
    color: '#3B82F6',
  },
  {
    title: 'Al-Adab Al-Mufrad',
    author: 'Imam al-Bukhari',
    description: 'A collection of hadiths on manners and character in Islam',
    url: 'https://archive.org/download/al-adab-al-mufrad-english/al-adab-al-mufrad-english.pdf',
    icon: '📙',
    color: '#F59E0B',
  },
  {
    title: 'Usool at-Tafseer',
    author: 'Dr. Bilal Philips',
    description: 'The methodology of Quranic interpretation',
    url: 'https://archive.org/download/UsoolAtTafseerTheFundamentals/UsoolAtTafseer.pdf',
    icon: '📕',
    color: '#EF4444',
  },
  {
    title: 'Kitab at-Tawheed',
    author: 'Muhammad ibn Abd al-Wahhab',
    description: "The Book of Monotheism — the foundation of Islamic theology",
    url: 'https://archive.org/download/KitabAtTawheed/KitabAtTawheed.pdf',
    icon: '📒',
    color: '#8B5CF6',
  },
  {
    title: 'Fiqh us-Sunnah',
    author: 'Sayyid Sabiq',
    description: 'Understanding Sunnah — practical Islamic jurisprudence',
    url: 'https://archive.org/download/FiqhUsSunnahVolume1/FiqhUsSunnahVol1.pdf',
    icon: '📓',
    color: '#0F6E56',
  },
] as const;
