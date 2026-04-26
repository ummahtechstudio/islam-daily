import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ContentLanguage = 'en' | 'ur' | 'hi' | 'bn' | 'ar' | 'tr';

export const CONTENT_LANGUAGE_KEY = 'content_language';

const COUNTRY_LANGUAGE_MAP: Record<string, ContentLanguage> = {
  PK: 'ur',
  BD: 'bn',
  SA: 'ar', AE: 'ar', EG: 'ar', KW: 'ar', QA: 'ar',
  OM: 'ar', BH: 'ar', JO: 'ar', LB: 'ar', SY: 'ar',
  IQ: 'ar', YE: 'ar', LY: 'ar', MA: 'ar', DZ: 'ar',
  TN: 'ar', SD: 'ar',
  TR: 'tr',
};

export function detectLanguageFromCountry(): ContentLanguage {
  const locales = Localization.getLocales();
  const locale = locales[0];

  // India: check device language (Urdu speakers → ur, else hi)
  if (locale?.regionCode === 'IN') {
    const lang = locale.languageCode?.toLowerCase() ?? '';
    return lang === 'ur' ? 'ur' : 'hi';
  }

  if (locale?.regionCode) {
    const mapped = COUNTRY_LANGUAGE_MAP[locale.regionCode];
    if (mapped) return mapped;
  }

  return 'en';
}

export async function getContentLanguage(): Promise<ContentLanguage> {
  try {
    const stored = await AsyncStorage.getItem(CONTENT_LANGUAGE_KEY);
    if (stored === 'auto' || !stored) return detectLanguageFromCountry();
    return stored as ContentLanguage;
  } catch {
    return detectLanguageFromCountry();
  }
}

export async function saveContentLanguage(lang: ContentLanguage | 'auto'): Promise<void> {
  await AsyncStorage.setItem(CONTENT_LANGUAGE_KEY, lang);
}

export const LANGUAGE_OPTIONS: { value: ContentLanguage | 'auto'; label: string; native: string }[] = [
  { value: 'auto',  label: 'Auto',    native: 'Auto (detect from country)' },
  { value: 'en',    label: 'English', native: 'English' },
  { value: 'ur',    label: 'Urdu',    native: 'اردو' },
  { value: 'hi',    label: 'Hindi',   native: 'हिन्दी' },
  { value: 'bn',    label: 'Bangla',  native: 'বাংলা' },
  { value: 'ar',    label: 'Arabic',  native: 'العربية' },
  { value: 'tr',    label: 'Turkish', native: 'Türkçe' },
];

export function isRtlLanguage(lang: ContentLanguage): boolean {
  return lang === 'ur' || lang === 'ar';
}
