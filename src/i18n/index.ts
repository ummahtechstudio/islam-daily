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

import en from './locales/en.json';
import ur from './locales/ur.json';
import { getAppLanguage } from '../utils/settings';

export const resources = {
  en: { translation: en },
  ur: { translation: ur },
} as const;

export const SUPPORTED_LANGUAGES = Object.keys(resources);
export const FALLBACK_LANGUAGE = 'en';

// The interface starts in English on a fresh install. The user's saved choice
// (English or Urdu) is applied asynchronously on startup via
// `applyPersistedAppLanguage()` — see app/_layout.tsx. We don't auto-detect the
// device locale here: the owner wants English to be the deliberate default,
// with Urdu opted into from Settings → Language.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: FALLBACK_LANGUAGE,
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

// Read the persisted App Language and switch the UI to it. Called once on
// startup. Safe to call before/after first render — react-i18next re-renders
// consumers when the language changes. Failures fall back to English silently.
export async function applyPersistedAppLanguage(): Promise<void> {
  try {
    const lang = await getAppLanguage();
    if (lang && i18n.language !== lang) {
      await i18n.changeLanguage(lang);
    }
  } catch {
    // Keep the English default if storage is unavailable.
  }
}

export default i18n;
