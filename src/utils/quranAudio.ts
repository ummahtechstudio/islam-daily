/**
 * Quran audio (everyayah.com streaming) — pure helpers.
 *
 * No state, no hooks, no side effects. The runtime lifecycle lives in
 * `src/context/QuranAudioContext.tsx`.
 */

import { SURAH_META } from '../constants/surahMeta';

export type QuranReciter = {
  id: string;
  /** everyayah.com folder name — verified to return audio/mpeg HTTP 200 */
  folder: string;
  name: string;
  /** Short label for the persistent player bar */
  shortName: string;
};

// All five verified against https://everyayah.com/data/{folder}/001001.mp3
// before being added here. If a folder ever 404s in production, mark it
// hidden — don't make up a substitute path.
export const RECITERS: QuranReciter[] = [
  {
    id: 'alafasy',
    folder: 'Alafasy_128kbps',
    name: 'Mishary Rashid Alafasy',
    shortName: 'Alafasy',
  },
  {
    id: 'abdul-basit-mujawwad',
    folder: 'Abdul_Basit_Mujawwad_128kbps',
    name: 'Abdul Basit Abdul Samad (Mujawwad)',
    shortName: 'Abdul Basit',
  },
  {
    id: 'sudais',
    folder: 'Abdurrahmaan_As-Sudais_192kbps',
    name: 'Abdul Rahman Al-Sudais',
    shortName: 'As-Sudais',
  },
  {
    id: 'ghamdi',
    folder: 'Ghamadi_40kbps',
    name: 'Saad Al-Ghamdi',
    shortName: 'Al-Ghamdi',
  },
  {
    id: 'muaiqly',
    folder: 'MaherAlMuaiqly128kbps',
    name: 'Maher Al-Muaiqly',
    shortName: 'Al-Muaiqly',
  },
];

export const DEFAULT_RECITER_ID = RECITERS[0].id;

export function getReciterById(id: string): QuranReciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/**
 * Build the everyayah.com URL for a specific ayah from a given reciter.
 * No network call — pure string composition.
 */
export function ayahAudioUrl(
  reciter: QuranReciter,
  surah: number,
  ayah: number,
): string {
  return `https://everyayah.com/data/${reciter.folder}/${pad3(surah)}${pad3(ayah)}.mp3`;
}

/**
 * Next ayah after {surah, ayah} with auto-advance across surahs.
 * Returns null when the user has reached the very end of the Quran.
 */
export function nextAyah(
  surah: number,
  ayah: number,
): { surah: number; ayah: number } | null {
  const meta = SURAH_META.find((m) => m.number === surah);
  if (!meta) return null;
  if (ayah < meta.ayah_count) return { surah, ayah: ayah + 1 };
  if (surah < 114) return { surah: surah + 1, ayah: 1 };
  return null;
}

/**
 * Previous ayah before {surah, ayah}, wrapping back to the previous surah's
 * last ayah. Returns null when already at Surah 1, Ayah 1.
 */
export function prevAyah(
  surah: number,
  ayah: number,
): { surah: number; ayah: number } | null {
  if (ayah > 1) return { surah, ayah: ayah - 1 };
  if (surah <= 1) return null;
  const prevSurah = SURAH_META.find((m) => m.number === surah - 1);
  if (!prevSurah) return null;
  return { surah: surah - 1, ayah: prevSurah.ayah_count };
}
