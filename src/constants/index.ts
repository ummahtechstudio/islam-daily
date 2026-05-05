export * from './colors';
export * from './fonts';
export * from './typography';
export * from './spacing';

export const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const PRAYER_ICONS = ['🌙', '🌅', '☀️', '🌤️', '🌇', '⭐'];

export const CALCULATION_METHODS = [
  { id: 0, name: 'Shafi, Maliki, Hanbali' },
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 2, name: 'Islamic Society of North America (ISNA)' },
  { id: 3, name: 'Muslim World League' },
  { id: 4, name: 'Umm Al-Qura, Makkah' },
  { id: 5, name: 'Egyptian General Authority of Survey' },
  { id: 7, name: 'Institute of Geophysics, Tehran' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Majlis Ugama Islam Singapura' },
  { id: 12, name: 'Union Organization islamic de France' },
  { id: 13, name: 'Diyanet İşleri Başkanlığı, Turkey' },
  { id: 14, name: 'Spiritual Administration of Muslims of Russia' },
];

export const HADITH_COLLECTIONS = [
  { key: 'bukhari',  name: 'Sahih Bukhari' },
  { key: 'muslim',   name: 'Sahih Muslim' },
  { key: 'tirmidhi', name: 'Jami at-Tirmidhi' },
  { key: 'abudawud', name: 'Sunan Abu Dawud' },
  { key: 'ibnmajah', name: 'Sunan Ibn Majah' },
  { key: 'nasai',    name: "Sunan an-Nasa'i" },
];

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
