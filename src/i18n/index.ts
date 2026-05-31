// ─── i18n bootstrap ──────────────────────────────────────────────────────────
// UI-string internationalisation for Islam Daily.
//
// Phase 1 (current): the framework is wired up and every user-facing UI string
// lives in the locale JSON files. English is the default + fallback, so the app
// renders identically to before. `ur.json` mirrors every key in `en.json` (its
// values are English copies for now) so Phase 2 can drop in real Urdu and a
// language switcher without touching any component.
//
// This is deliberately SEPARATE from the existing *content* language setting
// (`getTranslationLanguage` in src/utils/settings.ts), which switches the
// translation of duas/dhikr/hadith *content*. The two will be unified in Phase 2.
//
// Adding a new language later = drop in `locales/<code>.json` (mirroring en.json)
// and register it in the `resources` map below. Nothing else changes.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import ur from './locales/ur.json';

export const resources = {
  en: { translation: en },
  ur: { translation: ur },
} as const;

export const SUPPORTED_LANGUAGES = Object.keys(resources);
export const FALLBACK_LANGUAGE = 'en';

// Detect the device language. We only switch away from English when we actually
// ship that locale; everything unknown falls back to English. In Phase 1 every
// locale file holds English text, so detection never changes what's on screen.
function detectDeviceLanguage(): string {
  try {
    const code = Localization.getLocales()?.[0]?.languageCode?.toLowerCase();
    if (code && SUPPORTED_LANGUAGES.includes(code)) return code;
  } catch {
    // expo-localization can throw on some web/SSR contexts — fall through.
  }
  return FALLBACK_LANGUAGE;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: detectDeviceLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'translation',
    // React already escapes values, so i18next must not double-escape.
    interpolation: { escapeValue: false },
    returnNull: false,
    // Keys are nested objects (e.g. settings.theme.title); '.' is the separator.
    keySeparator: '.',
    nsSeparator: ':',
  });
}

export default i18n;
