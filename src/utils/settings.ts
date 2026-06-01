import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'settings_';

export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const value = await AsyncStorage.getItem(`${PREFIX}${key}`);
    if (value === null) return defaultValue;
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
};

export const setSetting = async <T>(key: string, value: T): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save setting:', key, e);
  }
};

export const resetAllSettings = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const settingsKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (settingsKeys.length > 0) {
      await AsyncStorage.multiRemove(settingsKeys);
    }
  } catch (e) {
    console.error('Failed to reset settings:', e);
  }
};

// ─── Translation language ────────────────────────────────────────────────────
// Controls which translation is shown for duas, dhikr (Arabic always shown).
// Default 'urdu' — primary audience is Pakistani.

export type TranslationLanguage = 'urdu' | 'english';

const TRANSLATION_LANGUAGE_KEY = `${PREFIX}translation_language`;

export const getTranslationLanguage = async (): Promise<TranslationLanguage> => {
  try {
    const v = await AsyncStorage.getItem(TRANSLATION_LANGUAGE_KEY);
    if (v === 'english' || v === 'urdu') return v;
    return 'urdu';
  } catch {
    return 'urdu';
  }
};

export const setTranslationLanguage = async (lang: TranslationLanguage): Promise<void> => {
  try {
    await AsyncStorage.setItem(TRANSLATION_LANGUAGE_KEY, lang);
  } catch (e) {
    console.error('Failed to save translation language:', e);
  }
};

// ─── App (interface) language ────────────────────────────────────────────────
// Controls which language the whole UI renders in (buttons, labels, menus) via
// i18next. Independent from the *translation* language above. Default 'en' so a
// fresh install shows the English interface; the user opts into Urdu.

export type AppLanguage = 'en' | 'ur';

const APP_LANGUAGE_KEY = `${PREFIX}app_language`;

export const getAppLanguage = async (): Promise<AppLanguage> => {
  try {
    const v = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    if (v === 'en' || v === 'ur') return v;
    return 'en';
  } catch {
    return 'en';
  }
};

export const setAppLanguage = async (lang: AppLanguage): Promise<void> => {
  try {
    await AsyncStorage.setItem(APP_LANGUAGE_KEY, lang);
  } catch (e) {
    console.error('Failed to save app language:', e);
  }
};
