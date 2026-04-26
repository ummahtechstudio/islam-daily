export type AudioLanguage = 'urdu' | 'arabic' | 'english';
export type AudioCategory =
  | 'quran_recitation'
  | 'quran_tafseer'
  | 'hadith'
  | 'bayans'
  | 'nasheed'
  | 'seerah'
  | 'kids';

export interface AudioItem {
  id: string;
  title_urdu: string;
  title_english: string;
  author: string;
  category: AudioCategory;
  sub_category: string;
  language: AudioLanguage;
  source_type: 'stream' | 'download';
  audio_url: string;
  duration_minutes: number;
  total_episodes?: number;
  cover_image?: string;
  is_favorite: boolean;
}

export const AUDIO_CATEGORIES = [
  { id: 'quran_recitation' as AudioCategory, label_urdu: 'تلاوت قرآن',  label_english: 'Quran Recitation',  icon: '📖', color: '#0F6E56' },
  { id: 'quran_tafseer'    as AudioCategory, label_urdu: 'درس قرآن',    label_english: 'Quran Tafseer',     icon: '🎓', color: '#3B82F6' },
  { id: 'hadith'           as AudioCategory, label_urdu: 'احادیث',      label_english: 'Hadith Audio',      icon: '📜', color: '#8B5CF6' },
  { id: 'bayans'           as AudioCategory, label_urdu: 'بیانات',      label_english: 'Bayans / Lectures', icon: '🎙️', color: '#F59E0B' },
  { id: 'nasheed'          as AudioCategory, label_urdu: 'نعت',         label_english: 'Nasheed / Naat',    icon: '🎵', color: '#EC4899' },
  { id: 'seerah'           as AudioCategory, label_urdu: 'سیرت',        label_english: 'Seerah Audio',      icon: '🌙', color: '#6366F1' },
  { id: 'kids'             as AudioCategory, label_urdu: 'بچوں کے لیے', label_english: 'Kids',              icon: '⭐', color: '#22C55E' },
] as const;

export const AUDIO_LIBRARY: AudioItem[] = [

  // ─── Quran Recitation ──────────────────────────────────────────────────────

  {
    id: 'q_abdulbasit_full',
    title_urdu: 'مکمل قرآن - عبدالباسط عبدالصمد',
    title_english: 'Full Quran – Abdul Basit (Murattal)',
    author: 'Abdul Basit Abdul Samad',
    category: 'quran_recitation', sub_category: 'Full Quran',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/abdulbaset/murattal/',
    duration_minutes: 1800, total_episodes: 114, is_favorite: false,
  },
  {
    id: 'q_mishary_full',
    title_urdu: 'مکمل قرآن - مشاری راشد العفاسی',
    title_english: 'Full Quran – Mishary Rashid Al-Afasy',
    author: 'Mishary Rashid Al-Afasy',
    category: 'quran_recitation', sub_category: 'Full Quran',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/mishary_rashid_alafasy/',
    duration_minutes: 1800, total_episodes: 114, is_favorite: false,
  },
  {
    id: 'q_sudais_shuraim_full',
    title_urdu: 'مکمل قرآن - السديس و الشريم',
    title_english: 'Full Quran – Sudais & Shuraim',
    author: 'Abdul Rahman Al-Sudais & Saud Al-Shuraim',
    category: 'quran_recitation', sub_category: 'Full Quran',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/sudais_shuraim/',
    duration_minutes: 1800, total_episodes: 114, is_favorite: false,
  },
  {
    id: 'q_sudais_solo_full',
    title_urdu: 'مکمل قرآن - عبدالرحمٰن السديس',
    title_english: 'Full Quran – Abdul Rahman Al-Sudais',
    author: 'Abdul Rahman Al-Sudais',
    category: 'quran_recitation', sub_category: 'Full Quran',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/abdurrahmaan_as-sudais_and_sa3ood_ash-shuraim/',
    duration_minutes: 1800, total_episodes: 114, is_favorite: false,
  },
  {
    id: 'q_urdu_trans_fateh',
    title_urdu: 'قرآن اردو ترجمہ - فتح محمد جالندھری',
    title_english: 'Quran with Urdu Translation – Fateh Muhammad Jalandhari',
    author: 'Fateh Muhammad Jalandhari',
    category: 'quran_recitation', sub_category: 'With Urdu Translation',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with authoritative archive.org Urdu translation audio URL
    audio_url: 'https://archive.org/download/QuranUrduTranslationJalandhari/001.mp3',
    duration_minutes: 2400, total_episodes: 114, is_favorite: false,
  },
  {
    id: 'q_surah_yasin_abdulbasit',
    title_urdu: 'سورۃ یٰسین - عبدالباسط',
    title_english: 'Surah Yasin – Abdul Basit',
    author: 'Abdul Basit Abdul Samad',
    category: 'quran_recitation', sub_category: 'Individual Surahs',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/abdulbaset/murattal/036.mp3',
    duration_minutes: 43, is_favorite: false,
  },
  {
    id: 'q_surah_rahman_mishary',
    title_urdu: 'سورۃ الرحمٰن - مشاری راشد',
    title_english: 'Surah Ar-Rahman – Mishary Rashid',
    author: 'Mishary Rashid Al-Afasy',
    category: 'quran_recitation', sub_category: 'Individual Surahs',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/mishary_rashid_alafasy/055.mp3',
    duration_minutes: 10, is_favorite: false,
  },
  {
    id: 'q_surah_mulk_sudais',
    title_urdu: 'سورۃ الملک - السديس',
    title_english: 'Surah Al-Mulk – Al-Sudais',
    author: 'Abdul Rahman Al-Sudais',
    category: 'quran_recitation', sub_category: 'Individual Surahs',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/abdurrahmaan_as-sudais_and_sa3ood_ash-shuraim/067.mp3',
    duration_minutes: 9, is_favorite: false,
  },
  {
    id: 'q_surah_kahf_mishary',
    title_urdu: 'سورۃ الکہف - مشاری راشد',
    title_english: 'Surah Al-Kahf – Mishary Rashid',
    author: 'Mishary Rashid Al-Afasy',
    category: 'quran_recitation', sub_category: 'Individual Surahs',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/mishary_rashid_alafasy/018.mp3',
    duration_minutes: 68, is_favorite: false,
  },
  {
    id: 'q_surah_waqiah_abdulbasit',
    title_urdu: 'سورۃ الواقعہ - عبدالباسط',
    title_english: 'Surah Al-Waqiah – Abdul Basit',
    author: 'Abdul Basit Abdul Samad',
    category: 'quran_recitation', sub_category: 'Individual Surahs',
    language: 'arabic', source_type: 'stream',
    audio_url: 'https://download.quranicaudio.com/quran/abdulbaset/murattal/056.mp3',
    duration_minutes: 11, is_favorite: false,
  },

  // ─── Quran Tafseer ─────────────────────────────────────────────────────────

  {
    id: 'tafseer_tafheem_fatiha',
    title_urdu: 'تفہیم القرآن - سورۃ الفاتحہ',
    title_english: 'Tafheem-ul-Quran Audio – Surah Al-Fatiha',
    author: 'Maulana Maududi',
    category: 'quran_tafseer', sub_category: 'Tafheem-ul-Quran',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working Tafheem-ul-Quran audio URL from archive.org
    audio_url: 'https://archive.org/download/TafheemulQuranUrdu/tafheem_fatiha.mp3',
    duration_minutes: 30, is_favorite: false,
  },
  {
    id: 'tafseer_tafheem_series',
    title_urdu: 'تفہیم القرآن - مکمل سلسلہ',
    title_english: 'Tafheem-ul-Quran Audio – Full Series',
    author: 'Maulana Maududi',
    category: 'quran_tafseer', sub_category: 'Tafheem-ul-Quran',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working Tafheem-ul-Quran full series URL from archive.org
    audio_url: 'https://archive.org/download/TafheemulQuranUrdu/tafheem_001.mp3',
    duration_minutes: 60, total_episodes: 30, is_favorite: false,
  },
  {
    id: 'tafseer_bayan_baqarah',
    title_urdu: 'بیان القرآن - سورۃ البقرہ',
    title_english: 'Bayan-ul-Quran – Surah Al-Baqarah',
    author: 'Dr. Israr Ahmed',
    category: 'quran_tafseer', sub_category: 'Bayan-ul-Quran',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with Dr. Israr Ahmed Bayan-ul-Quran archive.org URL
    audio_url: 'https://archive.org/download/bayanulquran_israr/bayan_baqarah_001.mp3',
    duration_minutes: 90, total_episodes: 20, is_favorite: false,
  },
  {
    id: 'tafseer_bayan_imran',
    title_urdu: 'بیان القرآن - سورۃ آل عمران',
    title_english: 'Bayan-ul-Quran – Surah Al-Imran',
    author: 'Dr. Israr Ahmed',
    category: 'quran_tafseer', sub_category: 'Bayan-ul-Quran',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with Dr. Israr Ahmed archive.org URL
    audio_url: 'https://archive.org/download/bayanulquran_israr/bayan_imran_001.mp3',
    duration_minutes: 85, total_episodes: 15, is_favorite: false,
  },
  {
    id: 'tafseer_bayan_yasin',
    title_urdu: 'بیان القرآن - سورۃ یٰسین',
    title_english: 'Bayan-ul-Quran – Surah Yasin',
    author: 'Dr. Israr Ahmed',
    category: 'quran_tafseer', sub_category: 'Bayan-ul-Quran',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with Dr. Israr Ahmed archive.org URL
    audio_url: 'https://archive.org/download/bayanulquran_israr/bayan_yasin_001.mp3',
    duration_minutes: 45, total_episodes: 5, is_favorite: false,
  },

  // ─── Hadith ────────────────────────────────────────────────────────────────

  {
    id: 'hadith_riyadh_pt1',
    title_urdu: 'ریاض الصالحین - حصہ اول',
    title_english: 'Riyadh-us-Saliheen Audio – Part 1',
    author: 'Imam Nawawi',
    category: 'hadith', sub_category: 'Riyadh-us-Saliheen',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working Riyadh-us-Saliheen Urdu audio URL from archive.org
    audio_url: 'https://archive.org/download/riyadh_saliheen_urdu/riyadh_pt1.mp3',
    duration_minutes: 45, total_episodes: 20, is_favorite: false,
  },
  {
    id: 'hadith_riyadh_pt2',
    title_urdu: 'ریاض الصالحین - حصہ دوم',
    title_english: 'Riyadh-us-Saliheen Audio – Part 2',
    author: 'Imam Nawawi',
    category: 'hadith', sub_category: 'Riyadh-us-Saliheen',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working Riyadh-us-Saliheen Urdu audio URL from archive.org
    audio_url: 'https://archive.org/download/riyadh_saliheen_urdu/riyadh_pt2.mp3',
    duration_minutes: 45, total_episodes: 20, is_favorite: false,
  },
  {
    id: 'hadith_bukhari_urdu_1',
    title_urdu: 'صحیح بخاری اردو - کتاب الوحی',
    title_english: 'Sahih Bukhari Urdu – Book of Revelation',
    author: 'Imam Bukhari',
    category: 'hadith', sub_category: 'Sahih Bukhari',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working Sahih Bukhari Urdu audio URL from archive.org
    audio_url: 'https://archive.org/download/sahihbukhari_urdu/bukhari_001.mp3',
    duration_minutes: 60, total_episodes: 97, is_favorite: false,
  },
  {
    id: 'hadith_bukhari_urdu_2',
    title_urdu: 'صحیح بخاری اردو - کتاب الایمان',
    title_english: 'Sahih Bukhari Urdu – Book of Faith',
    author: 'Imam Bukhari',
    category: 'hadith', sub_category: 'Sahih Bukhari',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working Sahih Bukhari Urdu audio URL from archive.org
    audio_url: 'https://archive.org/download/sahihbukhari_urdu/bukhari_002.mp3',
    duration_minutes: 55, total_episodes: 97, is_favorite: false,
  },
  {
    id: 'hadith_40_nawawi',
    title_urdu: 'چالیس احادیث نووی',
    title_english: '40 Hadith Nawawi – Audio',
    author: 'Imam Nawawi',
    category: 'hadith', sub_category: 'Forty Hadith',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working 40 Hadith Nawawi Urdu audio URL from archive.org
    audio_url: 'https://archive.org/download/40hadith_nawawi_urdu/40hadith.mp3',
    duration_minutes: 120, total_episodes: 40, is_favorite: false,
  },

  // ─── Bayans / Lectures ─────────────────────────────────────────────────────

  {
    id: 'bayan_tj_tawbah',
    title_urdu: 'توبہ - مولانا طارق جمیل',
    title_english: 'Tawbah (Repentance) – Maulana Tariq Jameel',
    author: 'Maulana Tariq Jameel',
    category: 'bayans', sub_category: 'Maulana Tariq Jameel',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working Tariq Jameel bayan archive.org URL
    audio_url: 'https://archive.org/download/tariq_jameel_bayans/tawbah.mp3',
    duration_minutes: 45, is_favorite: false,
  },
  {
    id: 'bayan_tj_akhirat',
    title_urdu: 'آخرت کی تیاری - مولانا طارق جمیل',
    title_english: 'Preparation for Akhirah – Maulana Tariq Jameel',
    author: 'Maulana Tariq Jameel',
    category: 'bayans', sub_category: 'Maulana Tariq Jameel',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org URL
    audio_url: 'https://archive.org/download/tariq_jameel_bayans/akhirat.mp3',
    duration_minutes: 50, is_favorite: false,
  },
  {
    id: 'bayan_tj_maa_baap',
    title_urdu: 'ماں باپ کا مقام - مولانا طارق جمیل',
    title_english: 'Rights of Parents – Maulana Tariq Jameel',
    author: 'Maulana Tariq Jameel',
    category: 'bayans', sub_category: 'Maulana Tariq Jameel',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org URL
    audio_url: 'https://archive.org/download/tariq_jameel_bayans/maa_baap.mp3',
    duration_minutes: 40, is_favorite: false,
  },
  {
    id: 'bayan_israr_iman',
    title_urdu: 'ایمان کی حقیقت - ڈاکٹر اسرار احمد',
    title_english: 'Reality of Iman – Dr. Israr Ahmed',
    author: 'Dr. Israr Ahmed',
    category: 'bayans', sub_category: 'Dr. Israr Ahmed',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working Dr. Israr Ahmed archive.org URL
    audio_url: 'https://archive.org/download/israr_ahmed_lectures/iman_haqeeqat.mp3',
    duration_minutes: 60, is_favorite: false,
  },
  {
    id: 'bayan_israr_khilafat',
    title_urdu: 'نظامِ خلافت - ڈاکٹر اسرار احمد',
    title_english: 'System of Khilafah – Dr. Israr Ahmed',
    author: 'Dr. Israr Ahmed',
    category: 'bayans', sub_category: 'Dr. Israr Ahmed',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org URL
    audio_url: 'https://archive.org/download/israr_ahmed_lectures/khilafat.mp3',
    duration_minutes: 75, is_favorite: false,
  },
  {
    id: 'bayan_israr_qurani_inqilab',
    title_urdu: 'قرآنی انقلاب - ڈاکٹر اسرار احمد',
    title_english: 'Quranic Revolution – Dr. Israr Ahmed',
    author: 'Dr. Israr Ahmed',
    category: 'bayans', sub_category: 'Dr. Israr Ahmed',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org URL
    audio_url: 'https://archive.org/download/israr_ahmed_lectures/qurani_inqilab.mp3',
    duration_minutes: 90, is_favorite: false,
  },
  {
    id: 'bayan_menk_gratitude',
    title_urdu: 'شکرگزاری - مفتی منک',
    title_english: 'The Importance of Gratitude – Mufti Menk',
    author: 'Mufti Ismail Menk',
    category: 'bayans', sub_category: 'Mufti Menk',
    language: 'english', source_type: 'stream',
    // TODO: Replace with working Mufti Menk archive.org URL
    audio_url: 'https://archive.org/download/mufti_menk_lectures/gratitude.mp3',
    duration_minutes: 45, is_favorite: false,
  },
  {
    id: 'bayan_menk_forgiveness',
    title_urdu: 'معافی اور درگزر - مفتی منک',
    title_english: 'Forgiveness in Islam – Mufti Menk',
    author: 'Mufti Ismail Menk',
    category: 'bayans', sub_category: 'Mufti Menk',
    language: 'english', source_type: 'stream',
    // TODO: Replace with working Mufti Menk archive.org URL
    audio_url: 'https://archive.org/download/mufti_menk_lectures/forgiveness.mp3',
    duration_minutes: 48, is_favorite: false,
  },
  {
    id: 'bayan_menk_character',
    title_urdu: 'اچھا اخلاق - مفتی منک',
    title_english: 'Good Character – Mufti Menk',
    author: 'Mufti Ismail Menk',
    category: 'bayans', sub_category: 'Mufti Menk',
    language: 'english', source_type: 'stream',
    // TODO: Replace with working Mufti Menk archive.org URL
    audio_url: 'https://archive.org/download/mufti_menk_lectures/good_character.mp3',
    duration_minutes: 52, is_favorite: false,
  },
  {
    id: 'bayan_nak_quran_miracles',
    title_urdu: 'قرآن کے معجزات - نعمان علی خان',
    title_english: 'Miracles of the Quran – Nouman Ali Khan',
    author: 'Nouman Ali Khan',
    category: 'bayans', sub_category: 'Nouman Ali Khan',
    language: 'english', source_type: 'stream',
    // TODO: Replace with working Nouman Ali Khan archive.org URL
    audio_url: 'https://archive.org/download/nouman_ali_khan/quran_miracles.mp3',
    duration_minutes: 55, is_favorite: false,
  },
  {
    id: 'bayan_nak_purpose',
    title_urdu: 'زندگی کا مقصد - نعمان علی خان',
    title_english: 'Purpose of Life – Nouman Ali Khan',
    author: 'Nouman Ali Khan',
    category: 'bayans', sub_category: 'Nouman Ali Khan',
    language: 'english', source_type: 'stream',
    // TODO: Replace with working Nouman Ali Khan archive.org URL
    audio_url: 'https://archive.org/download/nouman_ali_khan/purpose_of_life.mp3',
    duration_minutes: 48, is_favorite: false,
  },
  {
    id: 'bayan_nak_salah',
    title_urdu: 'نماز کی اہمیت - نعمان علی خان',
    title_english: 'Importance of Salah – Nouman Ali Khan',
    author: 'Nouman Ali Khan',
    category: 'bayans', sub_category: 'Nouman Ali Khan',
    language: 'english', source_type: 'stream',
    // TODO: Replace with working Nouman Ali Khan archive.org URL
    audio_url: 'https://archive.org/download/nouman_ali_khan/salah_importance.mp3',
    duration_minutes: 40, is_favorite: false,
  },

  // ─── Nasheed / Naat ────────────────────────────────────────────────────────

  {
    id: 'naat_owais_har_lamha',
    title_urdu: 'ہر لمحہ - اویس رضا قادری',
    title_english: 'Har Lamha – Owais Raza Qadri',
    author: 'Owais Raza Qadri',
    category: 'nasheed', sub_category: 'Urdu Naats',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org Urdu naat URL
    audio_url: 'https://archive.org/download/urdu_naats_collection/owais_har_lamha.mp3',
    duration_minutes: 6, is_favorite: false,
  },
  {
    id: 'naat_junaid_muhammad_roza',
    title_urdu: 'محمد کا روضہ - جنید جمشید',
    title_english: "Muhammad Ka Roza – Junaid Jamshed",
    author: 'Junaid Jamshed',
    category: 'nasheed', sub_category: 'Urdu Naats',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org URL
    audio_url: 'https://archive.org/download/urdu_naats_collection/junaid_muhammad_roza.mp3',
    duration_minutes: 5, is_favorite: false,
  },
  {
    id: 'naat_ya_nabi_salam',
    title_urdu: 'یا نبی سلام علیک',
    title_english: 'Ya Nabi Salam Alayka',
    author: 'Various Artists',
    category: 'nasheed', sub_category: 'Urdu Naats',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org URL
    audio_url: 'https://archive.org/download/urdu_naats_collection/ya_nabi_salam.mp3',
    duration_minutes: 4, is_favorite: false,
  },
  {
    id: 'nasheed_tala_al_badr',
    title_urdu: 'طلع البدر علینا',
    title_english: "Tala' al-Badru 'Alayna – Traditional",
    author: 'Traditional',
    category: 'nasheed', sub_category: 'Arabic Nasheeds',
    language: 'arabic', source_type: 'stream',
    // TODO: Replace with working archive.org URL
    audio_url: 'https://archive.org/download/arabic_nasheeds/tala_al_badr.mp3',
    duration_minutes: 3, is_favorite: false,
  },
  {
    id: 'nasheed_maher_assalamu',
    title_urdu: 'اصلی علیک - ماہر زین',
    title_english: 'Assalamu Alayka – Maher Zain',
    author: 'Maher Zain',
    category: 'nasheed', sub_category: 'Arabic Nasheeds',
    language: 'arabic', source_type: 'stream',
    // TODO: Replace with official Maher Zain / Awakening Records URL
    audio_url: 'https://archive.org/download/arabic_nasheeds/maher_assalamu_alayka.mp3',
    duration_minutes: 4, is_favorite: false,
  },
  {
    id: 'nasheed_rabbana_sami',
    title_urdu: 'ربنا - سامی یوسف',
    title_english: 'Rabbana – Sami Yusuf',
    author: 'Sami Yusuf',
    category: 'nasheed', sub_category: 'Arabic Nasheeds',
    language: 'arabic', source_type: 'stream',
    // TODO: Replace with official Sami Yusuf URL
    audio_url: 'https://archive.org/download/arabic_nasheeds/rabbana_sami_yusuf.mp3',
    duration_minutes: 5, is_favorite: false,
  },
  {
    id: 'nasheed_sami_al_muallim',
    title_urdu: 'المعلم - سامی یوسف',
    title_english: "Al-Mu'allim – Sami Yusuf",
    author: 'Sami Yusuf',
    category: 'nasheed', sub_category: 'English Nasheeds',
    language: 'english', source_type: 'stream',
    // TODO: Replace with official Sami Yusuf URL
    audio_url: 'https://archive.org/download/english_nasheeds/sami_al_muallim.mp3',
    duration_minutes: 5, is_favorite: false,
  },
  {
    id: 'nasheed_maher_always',
    title_urdu: 'ہمیشہ ساتھ - ماہر زین',
    title_english: 'Always Be There – Maher Zain',
    author: 'Maher Zain',
    category: 'nasheed', sub_category: 'English Nasheeds',
    language: 'english', source_type: 'stream',
    // TODO: Replace with official Maher Zain URL
    audio_url: 'https://archive.org/download/english_nasheeds/maher_always_be_there.mp3',
    duration_minutes: 4, is_favorite: false,
  },

  // ─── Seerah ────────────────────────────────────────────────────────────────

  {
    id: 'seerah_sealed_nectar_1',
    title_urdu: 'الرحیق المختوم - حصہ اول',
    title_english: 'The Sealed Nectar – Part 1: Early Life',
    author: 'Safiur Rahman Mubarakpuri',
    category: 'seerah', sub_category: 'The Sealed Nectar',
    language: 'english', source_type: 'stream',
    // TODO: Replace with working archive.org Sealed Nectar audiobook URL
    audio_url: 'https://archive.org/download/sealed_nectar_audiobook/sealed_nectar_pt1.mp3',
    duration_minutes: 60, total_episodes: 10, is_favorite: false,
  },
  {
    id: 'seerah_sealed_nectar_2',
    title_urdu: 'الرحیق المختوم - حصہ دوم',
    title_english: 'The Sealed Nectar – Part 2: Prophethood',
    author: 'Safiur Rahman Mubarakpuri',
    category: 'seerah', sub_category: 'The Sealed Nectar',
    language: 'english', source_type: 'stream',
    // TODO: Replace with working archive.org Sealed Nectar audiobook URL
    audio_url: 'https://archive.org/download/sealed_nectar_audiobook/sealed_nectar_pt2.mp3',
    duration_minutes: 65, total_episodes: 10, is_favorite: false,
  },
  {
    id: 'seerah_israr_urdu',
    title_urdu: 'سیرت النبی ﷺ - ڈاکٹر اسرار احمد',
    title_english: 'Seerah of the Prophet ﷺ – Dr. Israr Ahmed',
    author: 'Dr. Israr Ahmed',
    category: 'seerah', sub_category: 'Seerah Lectures',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with Dr. Israr Ahmed Seerah archive.org URL
    audio_url: 'https://archive.org/download/israr_seerah/seerah_001.mp3',
    duration_minutes: 90, total_episodes: 12, is_favorite: false,
  },
  {
    id: 'seerah_nak_series',
    title_urdu: 'سیرت النبی ﷺ - نعمان علی خان',
    title_english: 'Seerah of the Prophet ﷺ – Nouman Ali Khan',
    author: 'Nouman Ali Khan',
    category: 'seerah', sub_category: 'Seerah Lectures',
    language: 'english', source_type: 'stream',
    // TODO: Replace with Nouman Ali Khan Seerah archive.org URL
    audio_url: 'https://archive.org/download/nak_seerah/seerah_001.mp3',
    duration_minutes: 75, total_episodes: 20, is_favorite: false,
  },

  // ─── Kids ──────────────────────────────────────────────────────────────────

  {
    id: 'kids_prophet_adam',
    title_urdu: 'حضرت آدم ؑ کی کہانی',
    title_english: 'Story of Prophet Adam (AS)',
    author: 'Islamic Stories for Kids',
    category: 'kids', sub_category: 'Prophet Stories Urdu',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working kids Islamic stories archive.org URL
    audio_url: 'https://archive.org/download/kids_islamic_stories/prophet_adam.mp3',
    duration_minutes: 15, is_favorite: false,
  },
  {
    id: 'kids_prophet_nuh',
    title_urdu: 'حضرت نوح ؑ کی کہانی',
    title_english: 'Story of Prophet Nuh (AS)',
    author: 'Islamic Stories for Kids',
    category: 'kids', sub_category: 'Prophet Stories Urdu',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working kids Islamic stories archive.org URL
    audio_url: 'https://archive.org/download/kids_islamic_stories/prophet_nuh.mp3',
    duration_minutes: 12, is_favorite: false,
  },
  {
    id: 'kids_prophet_ibrahim',
    title_urdu: 'حضرت ابراہیم ؑ کی کہانی',
    title_english: 'Story of Prophet Ibrahim (AS)',
    author: 'Islamic Stories for Kids',
    category: 'kids', sub_category: 'Prophet Stories Urdu',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working kids Islamic stories archive.org URL
    audio_url: 'https://archive.org/download/kids_islamic_stories/prophet_ibrahim.mp3',
    duration_minutes: 18, is_favorite: false,
  },
  {
    id: 'kids_prophet_yusuf',
    title_urdu: 'حضرت یوسف ؑ کی کہانی',
    title_english: 'Story of Prophet Yusuf (AS)',
    author: 'Islamic Stories for Kids',
    category: 'kids', sub_category: 'Prophet Stories Urdu',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working kids Islamic stories archive.org URL
    audio_url: 'https://archive.org/download/kids_islamic_stories/prophet_yusuf.mp3',
    duration_minutes: 20, is_favorite: false,
  },
  {
    id: 'kids_story_honesty',
    title_urdu: 'ایمانداری کی کہانی',
    title_english: 'Islamic Story – Honesty',
    author: 'Islamic Stories for Kids',
    category: 'kids', sub_category: 'Islamic Stories',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org kids stories URL
    audio_url: 'https://archive.org/download/kids_islamic_stories/honesty_story.mp3',
    duration_minutes: 10, is_favorite: false,
  },
  {
    id: 'kids_story_thankful',
    title_urdu: 'اللہ کا شکر',
    title_english: 'Islamic Story – Being Thankful',
    author: 'Islamic Stories for Kids',
    category: 'kids', sub_category: 'Islamic Stories',
    language: 'urdu', source_type: 'stream',
    // TODO: Replace with working archive.org kids stories URL
    audio_url: 'https://archive.org/download/kids_islamic_stories/thankful_story.mp3',
    duration_minutes: 8, is_favorite: false,
  },
];
