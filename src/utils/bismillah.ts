/**
 * Tanzil Uthmani bakes the Bismillah into ayah 1 of every surah except
 * At-Tawbah (9). Screens that already show Bismillah in a surah header need
 * to split it off the ayah text.
 *
 * The match is deliberately tolerant of combining-mark ORDER: the bundled
 * quran.json is not NFC-normalised (it writes shadda before fatha, e.g.
 * "ٱللَّهِ" as ل ّ َ), so a plain `startsWith` against a normalised constant
 * silently fails and the Bismillah ends up rendered twice.
 */

// Any Arabic harakat / Quranic annotation marks between two base letters.
const MARKS = '[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]*';

// Base letters of بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ, spaces as word gaps.
const BASE = 'بسم ٱلله ٱلرحمن ٱلرحيم';

const BISMILLAH_RE = new RegExp(
  '^[\\uFEFF\\u200C\\u200E\\u200F\\s]*(' +
    Array.from(BASE)
      .map((ch) => (ch === ' ' ? '\\s+' : ch + MARKS))
      .join('') +
    ')\\s*',
);

/**
 * Splits a leading Bismillah off `text`. If the whole text IS the Bismillah
 * (Al-Fatiha 1:1) nothing is split — that ayah must stay intact.
 */
export function splitLeadingBismillah(text: string): { bismillah: string | null; rest: string } {
  const m = BISMILLAH_RE.exec(text);
  if (!m) return { bismillah: null, rest: text };
  const rest = text.slice(m[0].length);
  if (rest.length === 0) return { bismillah: null, rest: text };
  return { bismillah: m[1], rest };
}
