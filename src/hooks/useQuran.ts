import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSurahList, fetchSurah, SurahMeta, SurahEdition } from '../services/api';

export function useSurahList() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSurahList()
      .then(setSurahs)
      .catch(() => setError('Failed to load Quran'))
      .finally(() => setLoading(false));
  }, []);

  return { surahs, loading, error };
}

export function useSurah(number: number, translation = 'ur.jalandhry') {
  const [arabic, setArabic] = useState<SurahEdition | null>(null);
  const [translationEdition, setTranslationEdition] = useState<SurahEdition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setFromCache(false);

    // Check offline pack first to set fromCache flag before fetching
    AsyncStorage.getItem(`offline_surah_${number}`).then((raw) => {
      if (raw) setFromCache(true);
    });

    fetchSurah(number, translation)
      .then(([ar, tr]) => {
        setArabic(ar);
        setTranslationEdition(tr);
      })
      .catch(() => setError('Failed to load surah'))
      .finally(() => setLoading(false));
  }, [number, translation]);

  return { arabic, translation: translationEdition, loading, error, fromCache };
}
