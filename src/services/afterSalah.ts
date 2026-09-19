/**
 * After-Salah Adhkar — the Sunnah sequence recited after every fard prayer,
 * assembled ONLY from content the app already ships and has verified:
 *
 *   - dhikr items: the `after_salah` category of assets/data/dhikr-core.json
 *   - the three Quls: Surahs 112–114 from assets/data/quran.json
 *
 * Nothing here is typed in from memory. Each step is looked up by a strict
 * matcher; if a component is ever missing from the data the step becomes a
 * clearly-marked `missing` placeholder instead of being silently invented.
 */

import { getBundledDhikr } from './content';
import { getAyahsForSurah } from './quranCache';
import { getSurahMeta, type SurahMetaEntry } from '../constants/surahMeta';
import { splitLeadingBismillah } from '../utils/bismillah';
import type { DhikrItem } from '../types/content';

export type AfterSalahAyah = {
  ayah: number;
  arabic: string;
  english?: string;
  urdu?: string;
};

export type AfterSalahStep =
  | { kind: 'dhikr'; id: string; count: number; item: DhikrItem }
  | {
      kind: 'surah';
      id: string;
      count: 1;
      surah: SurahMetaEntry;
      /** Bismillah as it appears in the bundled text, shown as its own line. */
      bismillah: string | null;
      ayahs: AfterSalahAyah[];
    }
  | { kind: 'missing'; id: string; count: number; label: string };

type DhikrSpec = {
  id: string;
  /** Expected repetition — also used to pick the right variant of a dhikr. */
  count: number;
  /** Human label used only if the item is missing from the data. */
  label: string;
  match: (transliteration: string) => boolean;
};

const AFTER_SALAH_CATEGORY_ID = 'after_salah';

// Order follows the sequence in the v1.1 brief. Matching is done against the
// transliteration of items INSIDE the after_salah category only, so a similar
// dhikr from the morning/evening/general categories can never be picked up.
const DHIKR_SPECS_BEFORE_QURAN: DhikrSpec[] = [
  { id: 'istighfar', count: 3, label: 'Astaghfirullah ×3', match: (t) => /^astaghfirullah$/i.test(t) },
  { id: 'antas-salam', count: 1, label: 'Allahumma anta as-Salam…', match: (t) => /antas-salaam/i.test(t) },
  { id: 'subhanallah', count: 33, label: 'SubhanAllah ×33', match: (t) => /^subhanallah$/i.test(t) },
  { id: 'alhamdulillah', count: 33, label: 'Alhamdulillah ×33', match: (t) => /^alhamdulillah$/i.test(t) },
  { id: 'allahu-akbar', count: 33, label: 'Allahu Akbar ×33', match: (t) => /^allahu akbar$/i.test(t) },
  { id: 'completing-100', count: 1, label: 'La ilaha illallahu wahdahu… (completing 100)', match: (t) => /wahdahu la shareeka/i.test(t) },
  { id: 'ayat-al-kursi', count: 1, label: 'Ayat al-Kursi', match: (t) => /ayat al-kursi/i.test(t) },
];

const QUL_SURAHS = [112, 113, 114] as const;

// Present in the app's after_salah data (Abu Dawud 1522 — the dua the Prophet
// ﷺ taught Mu'adh رضي الله عنه to say after every prayer); kept as the closing step.
const DHIKR_SPECS_AFTER_QURAN: DhikrSpec[] = [
  { id: 'muadh-dua', count: 1, label: "Allahumma a'inni 'ala dhikrika…", match: (t) => /a'innee 'ala dhikrika/i.test(t) },
];

function findDhikr(spec: DhikrSpec, items: DhikrItem[]): AfterSalahStep {
  const item = items.find((it) => spec.match(it.transliteration) && it.count === spec.count);
  if (!item) return { kind: 'missing', id: spec.id, count: spec.count, label: spec.label };
  return { kind: 'dhikr', id: spec.id, count: spec.count, item };
}

function buildSurahStep(surahNumber: number): AfterSalahStep {
  const surah = getSurahMeta(surahNumber);
  const rows = getAyahsForSurah(surahNumber);
  if (!surah || rows.length !== surah.ayah_count || !rows.every((r) => r.text_arabic)) {
    return {
      kind: 'missing',
      id: `surah-${surahNumber}`,
      count: 1,
      label: surah ? `Surah ${surah.name_english}` : `Surah ${surahNumber}`,
    };
  }

  // Tanzil Uthmani bakes the Bismillah into ayah 1; show it as its own line.
  let bismillah: string | null = null;
  const ayahs: AfterSalahAyah[] = rows.map((r) => {
    let arabic = r.text_arabic ?? '';
    if (r.ayah === 1) {
      const split = splitLeadingBismillah(arabic);
      bismillah = split.bismillah;
      arabic = split.rest;
    }
    return { ayah: r.ayah, arabic, english: r.translation_en, urdu: r.translation_ur };
  });

  return { kind: 'surah', id: `surah-${surahNumber}`, count: 1, surah, bismillah, ayahs };
}

let memo: AfterSalahStep[] | null = null;

export function getAfterSalahSequence(): AfterSalahStep[] {
  if (memo) return memo;
  const category = getBundledDhikr().find((c) => c.id === AFTER_SALAH_CATEGORY_ID);
  const items = category?.items ?? [];
  memo = [
    ...DHIKR_SPECS_BEFORE_QURAN.map((spec) => findDhikr(spec, items)),
    ...QUL_SURAHS.map(buildSurahStep),
    ...DHIKR_SPECS_AFTER_QURAN.map((spec) => findDhikr(spec, items)),
  ];
  return memo;
}
