import { useState, useEffect } from 'react';
import {
  fetchSurahList,
  fetchSurah,
  SurahMeta,
  SurahEdition,
} from '../services/api';
import {
  buildBundledSurah,
  bundledFallbackEdition,
  bundledSurahList,
} from '../services/quranBundled';
import { splitLeadingBismillah } from '../utils/bismillah';

// Tanzil Uthmani's `arabic_text` column has Bismillah baked into ayah 1 for
// every surah except At-Tawbah (9). For Surah 1 that's correct (Bismillah IS
// ayah 1). For all other surahs the surah header already shows Bismillah, so
// keeping it on ayah 1 too produces a duplicate. Strip it on the Translation
// path; the Mushaf view uses `text_indopak` (already clean) and is untouched.
// The match is combining-mark-order-insensitive (see utils/bismillah): the
// bundled quran.json is not NFC-normalised, so the previous fixed-string
// startsWith never matched it and the Bismillah was rendered twice.
function stripBismillahFromFirstAyah(s: SurahEdition): SurahEdition {
  if (s.number === 1) return s; // Al-Fatiha: Bismillah IS ayah 1
  const ayahs = s.ayahs.map((a) => {
    if (a.numberInSurah !== 1) return a;
    const { bismillah, rest } = splitLeadingBismillah(a.text);
    if (!bismillah) return a; // Also covers "would empty the ayah" — the helper never strips to ''
    return { ...a, text: rest };
  });
  return { ...s, ayahs };
}

export function useSurahList() {
  // The full surah list ships with the app, so the list renders instantly and
  // works offline; the network copy only refreshes it when reachable.
  const [surahs, setSurahs] = useState<SurahMeta[]>(() => bundledSurahList());
  const loading = false;
  const error: string | null = null;

  useEffect(() => {
    let active = true;
    fetchSurahList()
      .then((list) => {
        if (active && Array.isArray(list) && list.length === 114) setSurahs(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
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
    let active = true;
    setLoading(true);
    setError(null);
    setFromCache(false);

    // Arabic always comes from the bundle; the translation does only when the
    // requested edition IS one of the two bundled ones (Jalandhri / Asad).
    const bundled = buildBundledSurah(number, translation);
    if (bundled?.arabic && bundled.translation) {
      setArabic(stripBismillahFromFirstAyah(bundled.arabic));
      setTranslationEdition(bundled.translation);
      setFromCache(true);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    fetchSurah(number, translation)
      .then(([ar, tr]) => {
        if (!active) return;
        // Prefer the bundled Arabic (Tanzil Uthmani is universal); the network
        // supplies the requested translation edition.
        setArabic(stripBismillahFromFirstAyah(bundled?.arabic ?? ar));
        setTranslationEdition(tr);
        if (bundled?.arabic) setFromCache(true);
      })
      .catch(() => {
        if (!active) return;
        // Offline and the chosen edition isn't bundled: show a bundled
        // translation instead, carrying ITS OWN edition id so the reader labels
        // it correctly (never as the edition the user picked).
        const fb = buildBundledSurah(number, bundledFallbackEdition(translation));
        if (fb?.arabic && fb.translation) {
          setArabic(stripBismillahFromFirstAyah(fb.arabic));
          setTranslationEdition(fb.translation);
          setFromCache(true);
        } else {
          setError('Failed to load surah');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [number, translation]);

  return {
    arabic,
    translation: translationEdition,
    loading,
    error,
    fromCache,
  };
}
