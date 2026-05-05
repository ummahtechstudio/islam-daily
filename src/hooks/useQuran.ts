import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchSurahList,
  fetchSurah,
  SurahMeta,
  SurahEdition,
  Ayah,
} from '../services/api';
import {
  AyahLite,
  getAyahsForSurah,
  isQuranCached,
} from '../services/quranCache';
import { SURAH_META } from '../constants/surahMeta';

// Cumulative ayah offsets so we can compute global ayah numbers (used by the
// audio CDN URL: /quran/audio/128/<reciter>/<globalAyahNumber>.mp3).
const SURAH_OFFSETS: number[] = (() => {
  const arr: number[] = [];
  let cum = 0;
  for (const m of SURAH_META) {
    arr[m.number] = cum;
    cum += m.ayah_count;
  }
  return arr;
})();

function ayahFromCache(a: AyahLite, text: string, offset: number): Ayah {
  return {
    number: offset + a.ayah,
    text,
    numberInSurah: a.ayah,
    juz: 0,
    manzil: 0,
    page: a.page_indopak,
    ruku: 0,
    hizbQuarter: 0,
    sajda: false,
  };
}

// Tanzil Uthmani's `arabic_text` column has Bismillah baked into ayah 1 for
// every surah except At-Tawbah (9). For Surah 1 that's correct (Bismillah IS
// ayah 1). For all other surahs the surah header already shows Bismillah, so
// keeping it on ayah 1 too produces a duplicate. Strip it on the Translation
// path; the Mushaf view uses `text_indopak` (already clean) and is untouched.
const BISMILLAH_PREFIX = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

function stripBismillahFromFirstAyah(s: SurahEdition): SurahEdition {
  if (s.number === 1) return s; // Al-Fatiha: Bismillah IS ayah 1
  const ayahs = s.ayahs.map((a) => {
    if (a.numberInSurah !== 1) return a;
    // Skip optional BOM / zero-width / NBSP at the start, then check prefix.
    const head = a.text.replace(/^[﻿‌‎‏ ]+/, '');
    if (!head.startsWith(BISMILLAH_PREFIX)) return a;
    const rest = head.slice(BISMILLAH_PREFIX.length).replace(/^\s+/, '');
    if (rest.length === 0) return a; // Defensive: never strip if it would empty the ayah
    return { ...a, text: rest };
  });
  return { ...s, ayahs };
}

type CachedSurah = {
  arabic: SurahEdition;
  translation: SurahEdition | null;
};

function buildSurahFromCache(
  surahNumber: number,
  translationEdition: string,
): CachedSurah | null {
  const ayahs = getAyahsForSurah(surahNumber);
  if (ayahs.length === 0) return null;
  const meta = SURAH_META.find((m) => m.number === surahNumber);
  if (!meta) return null;
  if (!ayahs.every((a) => a.text_arabic && a.text_arabic.length > 0)) {
    return null;
  }

  const offset = SURAH_OFFSETS[surahNumber] ?? 0;
  const revelationType =
    meta.revelation_place === 'makkah' ? 'Meccan' : 'Medinan';

  const arabic: SurahEdition = {
    number: surahNumber,
    name: meta.name_arabic,
    englishName: meta.name_english,
    englishNameTranslation: '',
    revelationType,
    numberOfAyahs: meta.ayah_count,
    ayahs: ayahs.map((a) => ayahFromCache(a, a.text_arabic ?? '', offset)),
    edition: {
      identifier: 'quran-uthmani',
      language: 'ar',
      name: 'Tanzil Uthmani',
    },
  };

  const lang = translationEdition.split('.')[0];
  const trTextOf = (a: AyahLite): string | undefined => {
    if (lang === 'ur') return a.translation_ur;
    if (lang === 'en') return a.translation_en;
    return undefined;
  };
  const sample = trTextOf(ayahs[0]);
  if (!sample || !ayahs.every((a) => trTextOf(a))) {
    return { arabic, translation: null };
  }

  const translation: SurahEdition = {
    number: surahNumber,
    name: meta.name_arabic,
    englishName: meta.name_english,
    englishNameTranslation: '',
    revelationType,
    numberOfAyahs: meta.ayah_count,
    ayahs: ayahs.map((a) => ayahFromCache(a, trTextOf(a) ?? '', offset)),
    edition: {
      identifier: translationEdition,
      language: lang,
      name: translationEdition,
    },
  };

  return { arabic, translation };
}

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
  const [translationEdition, setTranslationEdition] =
    useState<SurahEdition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setFromCache(false);

    const cached = isQuranCached()
      ? buildSurahFromCache(number, translation)
      : null;

    // Cache covers BOTH arabic + translation: fully offline render, done.
    if (cached?.arabic && cached.translation) {
      setArabic(stripBismillahFromFirstAyah(cached.arabic));
      setTranslationEdition(cached.translation);
      setFromCache(true);
      setLoading(false);
      return;
    }

    AsyncStorage.getItem(`offline_surah_${number}`)
      .then((raw) => {
        if (raw) setFromCache(true);
      })
      .catch((err) =>
        console.warn('[useQuran] offline-pack lookup failed', err),
      );

    fetchSurah(number, translation)
      .then(([ar, tr]) => {
        // Prefer cached Arabic when we have it (Tanzil Uthmani is universal);
        // network supplies the requested translation edition.
        setArabic(stripBismillahFromFirstAyah(cached?.arabic ?? ar));
        setTranslationEdition(tr);
        if (cached?.arabic) setFromCache(true);
      })
      .catch(() => setError('Failed to load surah'))
      .finally(() => setLoading(false));
  }, [number, translation]);

  return {
    arabic,
    translation: translationEdition,
    loading,
    error,
    fromCache,
  };
}
