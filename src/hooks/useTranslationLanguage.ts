import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  getTranslationLanguage,
  type TranslationLanguage,
} from '../utils/settings';

/**
 * Translation-language preference (Urdu/English) for dua & dhikr content.
 * Re-reads on screen focus so a change made in Settings is reflected when
 * the user navigates back — same pattern DuasSubtab uses inline.
 */
export function useTranslationLanguage(): TranslationLanguage {
  const [language, setLanguage] = useState<TranslationLanguage>('urdu');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTranslationLanguage().then((lang) => {
        if (active) setLanguage(lang);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return language;
}
