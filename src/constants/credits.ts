/**
 * Sources & Credits — every third-party data source, service, font and
 * library the app ships or calls, with its license where known.
 *
 * Proper nouns, URLs and license names live here (never translated); the
 * section titles and explanatory sentences are i18n keys under `credits.*`
 * so the screen reads correctly in English and Urdu.
 *
 * Inventory basis (2026-09-19): package.json runtime deps + every fetch()/URL
 * in src/ and app/ + assets/data + assets/fonts + assets/audio.
 */

export type CreditEntry = {
  /** Proper noun — shown as-is in every language. */
  name: string;
  /** i18n key (credits.entries.*) for the one-line description. */
  descKey?: string;
  license?: string;
  url?: string;
};

export type CreditSection = {
  id: string;
  /** i18n key for the section title (credits.sections.*). */
  titleKey: string;
  entries: CreditEntry[];
  /** Optional verbatim legal block shown in a monospace box (never translated). */
  verbatimNotice?: string;
};

// Reproduced exactly as distributed by Tanzil Project (see
// assets/data/TANZIL-NOTICE.txt). Their terms require this notice wherever a
// substantial portion of the text is included.
export const TANZIL_NOTICE = `Tanzil Quran Text (Uthmani, Version 1.1)
Copyright (C) 2007-2026 Tanzil Project
License: Creative Commons Attribution 3.0

This copy of the Quran text is carefully produced, highly verified and continuously monitored by a group of specialists at Tanzil Project.

TERMS OF USE:
- Permission is granted to copy and distribute verbatim copies of this text, but CHANGING IT IS NOT ALLOWED.
- This Quran text can be used in any website or application, provided that its source (Tanzil Project) is clearly indicated, and a link is made to tanzil.net to enable users to keep track of changes.
- This copyright notice shall be included in all verbatim copies of the text, and shall be reproduced appropriately in all files derived from or containing substantial portion of this text.

Please check updates at: http://tanzil.net/updates/`;

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

export const CREDIT_SECTIONS: CreditSection[] = [
  {
    id: 'quranText',
    titleKey: 'quranText',
    entries: [
      { name: 'Tanzil Project — Quran text (Uthmani)', descKey: 'tanzil', license: 'CC BY 3.0 (Tanzil terms)', url: 'https://tanzil.net' },
    ],
    verbatimNotice: TANZIL_NOTICE,
  },
  {
    id: 'mushaf',
    titleKey: 'mushaf',
    entries: [
      { name: 'QUL — Quranic Universal Library (Tarteel): "Quran Script: IndoPak Nastaleeq"', descKey: 'qul', url: 'https://qul.tarteel.ai' },
      { name: 'Quran.com API (api.qurancdn.com)', descKey: 'quranCom', url: 'https://quran.com' },
      { name: 'AlQuran IndoPak font by QuranWBW (Ayman Siddiqui)', descKey: 'indopakFont', license: 'Based on Al Qalam Quran Majeed / KFGQPC — see quranwbw.com', url: 'https://quranwbw.com' },
    ],
  },
  {
    id: 'translations',
    titleKey: 'translations',
    entries: [
      { name: 'Muhammad Asad — The Message of the Qurʼan (English)', descKey: 'bundledEn' },
      { name: 'Fateh Muhammad Jalandhri (Urdu)', descKey: 'bundledUr' },
      { name: 'Al Quran Cloud API (Islamic Network)', descKey: 'alquranCloud', url: 'https://alquran.cloud' },
      {
        name:
          'Saheeh International · Abdullah Yusuf Ali · Marmaduke Pickthall · Sayyid Abul Ala Maududi (Urdu) · Suhel Farooq Khan (Hindi) · Muhiuddin Khan (Bengali) · Diyanet İşleri Başkanlığı (Turkish) · Kementerian Agama RI (Indonesian) · Muhammad Hamidullah (French) · Bubenheim & Elyas (German) · King Fahd Quran Complex — Tafsir al-Muyassar (Arabic)',
        descKey: 'networkEditions',
      },
    ],
  },
  {
    id: 'audio',
    titleKey: 'audio',
    entries: [
      { name: 'EveryAyah.com', descKey: 'everyayah', url: 'https://everyayah.com' },
      { name: 'Mishary Rashid Alafasy · Abdul Basit Abdul Samad (Mujawwad & Murattal) · Abdul Rahman Al-Sudais · Saad Al-Ghamdi · Maher Al-Muaiqly · Muhammad Siddiq Al-Minshawi (Murattal)', descKey: 'reciters' },
      { name: 'Islamic Network CDN (cdn.islamic.network)', descKey: 'islamicNetworkCdn', url: 'https://islamic.network' },
      { name: 'QuranicAudio.com', descKey: 'quranicAudio', url: 'https://quranicaudio.com' },
      { name: 'Internet Archive (archive.org)', descKey: 'archiveOrg', url: 'https://archive.org' },
      { name: 'IslamicFinder.org — adhan recordings', descKey: 'islamicFinder', url: 'https://www.islamicfinder.org' },
      { name: 'Notification adhan — "Beautiful adhan" by Adam-synagda (Wikimedia Commons), opening takbir', descKey: 'notificationAdhan', license: 'CC0 1.0 (public domain dedication)', url: 'https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg' },
    ],
  },
  {
    id: 'hadith',
    titleKey: 'hadith',
    entries: [
      { name: 'fawazahmed0/hadith-api', descKey: 'hadithApi', license: 'The Unlicense (public domain)', url: 'https://github.com/fawazahmed0/hadith-api' },
      { name: 'Sahih al-Bukhari · Sahih Muslim · Jami at-Tirmidhi · Sunan Abu Dawud · Sunan Ibn Majah · Sunan an-Nasaʼi · Muwatta Malik · Forty Hadith of an-Nawawi · Forty Hadith Qudsi · Forty Hadith of Shah Waliullah Dehlawi', descKey: 'collections' },
      { name: 'Al-Albani · Zubair Ali Zai · Shuaib Al Arnaut · Ahmad Muhammad Shakir · Bashar Awad Maarouf · Muhammad Muhyi Al-Din Abdul Hamid · Muhammad Fouad Abd al-Baqi · Abu Ghuddah · Salim al-Hilali', descKey: 'graders' },
      { name: 'Sahih al-Bukhari — Dr. Muhammad Muhsin Khan · Sahih Muslim — Abdul Hamid Siddiqui', descKey: 'englishTranslators' },
      { name: 'Urdu translations', descKey: 'urduTranslators' },
    ],
  },
  {
    id: 'duas',
    titleKey: 'duas',
    entries: [
      { name: 'Hisn al-Muslim (Fortress of the Muslim) — Saʼid ibn Ali ibn Wahf al-Qahtani', descKey: 'hisn' },
      { name: 'Namaz & Masnoon Duas guide — compiled by Ummah Tech Studio', descKey: 'namazGuide' },
      { name: '99 Names of Allah', descKey: 'names99' },
    ],
  },
  {
    id: 'prayer',
    titleKey: 'prayer',
    entries: [
      { name: 'adhan-js (Batoul Apps)', descKey: 'adhanJs', license: 'MIT', url: 'https://github.com/batoulapps/adhan-js' },
      { name: 'Aladhan API (Islamic Network)', descKey: 'aladhan', url: 'https://aladhan.com' },
      { name: 'Umm al-Qura calendar', descKey: 'ummAlQura' },
    ],
  },
  {
    id: 'maps',
    titleKey: 'maps',
    entries: [
      { name: OSM_ATTRIBUTION, descKey: 'osm', license: 'Open Database License (ODbL) 1.0', url: OSM_COPYRIGHT_URL },
      { name: 'Overpass API (overpass-api.de)', descKey: 'overpass', url: 'https://overpass-api.de' },
    ],
  },
  {
    id: 'fonts',
    titleKey: 'fonts',
    entries: [
      { name: 'Amiri — Khaled Hosny', descKey: 'amiri', license: 'SIL Open Font License 1.1', url: 'https://www.amirifont.org' },
      { name: 'Noto Nastaliq Urdu — Google', descKey: 'notoNastaliq', license: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/noto/specimen/Noto+Nastaliq+Urdu' },
      { name: 'Ionicons — Ionic', descKey: 'ionicons', license: 'MIT', url: 'https://ionic.io/ionicons' },
    ],
  },
  {
    id: 'libraries',
    titleKey: 'libraries',
    entries: [
      {
        name:
          'Expo SDK · React Native · React · expo-router · React Navigation · react-native-reanimated · react-native-mmkv · zustand · i18next / react-i18next · Supabase JS · react-native-svg · @react-native-community/netinfo · @react-native-async-storage/async-storage · react-native-gesture-handler · react-native-screens · react-native-safe-area-context',
        descKey: 'ossLibraries',
        license: 'MIT',
      },
    ],
  },
];
