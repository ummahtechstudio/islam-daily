/**
 * Data Validation Scanner
 * ------------------------
 * Scans religious content data files in /assets and reports any STRUCTURAL or
 * REFERENCE errors. Emits a console report (color-coded) and a timestamped
 * markdown report under /reports.
 *
 * Run:   npx tsx scripts/validate-data.ts
 * Exit:  0 if no errors, 1 if any error-severity issues found.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Reference data ──────────────────────────────────────────────────────────

const QURAN_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6,
];

// Surah-name → 1-based index (cleaned: lowercase, no spaces, no diacritics)
const SURAH_NAME_TO_INDEX: Record<string, number> = {
  alfatihah: 1, fatihah: 1, fatiha: 1, alfatiha: 1,
  albaqarah: 2, baqarah: 2, baqara: 2, albaqara: 2,
  alimran: 3, aliimran: 3, imran: 3, aleimran: 3,
  annisa: 4, nisa: 4, alnisa: 4,
  almaidah: 5, maidah: 5, almaida: 5,
  alanam: 6, anam: 6, alanaam: 6,
  alaraf: 7, araf: 7, alaaraf: 7,
  alanfal: 8, anfal: 8,
  attawbah: 9, tawbah: 9, attawba: 9, tawba: 9,
  yunus: 10,
  hud: 11,
  yusuf: 12,
  arrad: 13, rad: 13,
  ibrahim: 14,
  alhijr: 15, hijr: 15,
  annahl: 16, nahl: 16,
  alisra: 17, isra: 17, banuisrail: 17,
  alkahf: 18, kahf: 18, kahaf: 18,
  maryam: 19,
  taha: 20, taaha: 20,
  alanbiya: 21, anbiya: 21,
  alhajj: 22, hajj: 22,
  almuminun: 23, muminun: 23,
  annur: 24, nur: 24, alnoor: 24, noor: 24,
  alfurqan: 25, furqan: 25,
  ashshuara: 26, shuara: 26,
  annaml: 27, naml: 27,
  alqasas: 28, qasas: 28,
  alankabut: 29, ankabut: 29,
  arrum: 30, rum: 30, room: 30,
  luqman: 31,
  assajdah: 32, sajdah: 32,
  alahzab: 33, ahzab: 33,
  saba: 34,
  fatir: 35,
  yasin: 36, yaseen: 36,
  assaffat: 37, saffat: 37,
  sad: 38, saad: 38,
  azzumar: 39, zumar: 39,
  ghafir: 40, almumin: 40, mumin: 40,
  fussilat: 41,
  ashshura: 42, shura: 42,
  azzukhruf: 43, zukhruf: 43,
  addukhan: 44, dukhan: 44,
  aljathiyah: 45, jathiyah: 45,
  alahqaf: 46, ahqaf: 46,
  muhammad: 47,
  alfath: 48, fath: 48,
  alhujurat: 49, hujurat: 49,
  qaf: 50, qaaf: 50,
  adhdhariyat: 51, dhariyat: 51,
  attur: 52, tur: 52,
  annajm: 53, najm: 53,
  alqamar: 54, qamar: 54,
  arrahman: 55, rahman: 55,
  alwaqiah: 56, waqiah: 56, waqia: 56,
  alhadid: 57, hadid: 57,
  almujadilah: 58, mujadilah: 58,
  alhashr: 59, hashr: 59,
  almumtahanah: 60, mumtahanah: 60,
  assaff: 61, saff: 61,
  aljumuah: 62, jumuah: 62, jumua: 62,
  almunafiqun: 63, munafiqun: 63,
  attaghabun: 64, taghabun: 64,
  attalaq: 65, talaq: 65,
  attahrim: 66, tahrim: 66,
  almulk: 67, mulk: 67,
  alqalam: 68, qalam: 68,
  alhaqqah: 69, haqqah: 69,
  almaarij: 70, maarij: 70,
  nuh: 71, nooh: 71,
  aljinn: 72, jinn: 72,
  almuzzammil: 73, muzzammil: 73,
  almuddathir: 74, muddathir: 74,
  alqiyamah: 75, qiyamah: 75,
  alinsan: 76, insan: 76, addahr: 76,
  almursalat: 77, mursalat: 77,
  annaba: 78, naba: 78,
  annaziat: 79, naziat: 79,
  abasa: 80, abassa: 80,
  attakwir: 81, takwir: 81,
  alinfitar: 82, infitar: 82,
  almutaffifin: 83, mutaffifin: 83,
  alinshiqaq: 84, inshiqaq: 84,
  alburuj: 85, buruj: 85,
  attariq: 86, tariq: 86,
  alala: 87, ala: 87, aalaa: 87,
  alghashiyah: 88, ghashiyah: 88,
  alfajr: 89, fajr: 89,
  albalad: 90, balad: 90,
  ashshams: 91, shams: 91,
  allayl: 92, layl: 92, lail: 92,
  adduha: 93, duha: 93,
  ashsharh: 94, sharh: 94, alinshirah: 94, inshirah: 94,
  attin: 95, tin: 95,
  alalaq: 96, alaq: 96,
  alqadr: 97, qadr: 97,
  albayyinah: 98, bayyinah: 98,
  azzalzalah: 99, zalzalah: 99,
  aladiyat: 100, adiyat: 100,
  alqariah: 101, qariah: 101,
  attakathur: 102, takathur: 102,
  alasr: 103, asr: 103,
  alhumazah: 104, humazah: 104,
  alfil: 105, fil: 105,
  quraysh: 106, quraish: 106,
  almaun: 107, maun: 107,
  alkawthar: 108, kawthar: 108,
  alkafirun: 109, kafirun: 109,
  annasr: 110, nasr: 110,
  almasad: 111, masad: 111, allahab: 111, lahab: 111,
  alikhlas: 112, ikhlas: 112,
  alfalaq: 113, falaq: 113,
  annas: 114, nas: 114,
};

// Hadith collection max counts calibrated for A7med3bdulBaset/hadith-json v1.2.0 dataset.
// Some collections exceed canonical Darussalam edition counts due to extended numbering
// (split hadiths, supplementary narrations, edition-specific entries). These are NOT
// errors — different scholarly editions number hadiths differently. Verified 2026-04-27.
//   bukhari   7277  canonical, matches our data
//   muslim    7563  canonical (our file has 7459 — extended editions go higher)
//   tirmidhi  4053  A7med3bdulBaset edition (canonical Darussalam: 3956)
//   abudawud  5276  A7med3bdulBaset edition (canonical: 5274)
//   ibnmajah  4345  A7med3bdulBaset edition (canonical: 4341)
//   nasai     5768  A7med3bdulBaset edition (canonical: 5767)
const HADITH_COLLECTIONS: Record<string, { canonical: string; max: number; aliases: RegExp[] }> = {
  bukhari: {
    canonical: 'Sahih Bukhari',
    max: 7277,
    aliases: [/\bsahih\s*(?:al-?)?bukhari\b/i, /\bal-?bukhari\b/i, /\bsahih-?bukhari\b/i, /\bbukhari\b/i],
  },
  muslim: {
    canonical: 'Sahih Muslim',
    max: 7563,
    aliases: [/\bsahih\s*muslim\b/i, /\bsahih-?muslim\b/i, /\bmuslim\b/i],
  },
  tirmidhi: {
    canonical: 'Jami at-Tirmidhi',
    max: 4053,
    aliases: [/\bjami(?:['e])?\s*(?:at-?)?tirmidhi\b/i, /\bat-?tirmidhi\b/i, /\btirmidhi\b/i, /\btirmizi\b/i],
  },
  abudawud: {
    canonical: 'Sunan Abu Dawud',
    max: 5276,
    aliases: [/\bsunan\s*abu\s*dawud\b/i, /\babu\s*dawud\b/i, /\babu-?da'?ud\b/i, /\babudawud\b/i, /\babu\s*da'ud\b/i],
  },
  ibnmajah: {
    canonical: 'Sunan Ibn Majah',
    max: 4345,
    aliases: [/\bsunan\s*ibn\s*majah\b/i, /\bibn\s*majah\b/i, /\bibn-?maja\b/i, /\bibnmajah\b/i],
  },
  nasai: {
    canonical: "Sunan an-Nasa'i",
    max: 5768,
    aliases: [/\bsunan\s*(?:an-?)?nasa'?i\b/i, /\b(?:an-?)?nasa'?i\b/i, /\bnasai\b/i],
  },
  hisnulmuslim: {
    canonical: 'Hisn al-Muslim',
    max: 247,
    aliases: [/\bhisn\s*al-?muslim\b/i, /\bhisnul-?muslim\b/i, /\bhisn-?al-?muslim\b/i],
  },
  malik: {
    canonical: 'Muwatta Imam Malik',
    max: 1851,
    aliases: [/\bmuwatta\s*(?:imam\s*)?malik\b/i, /\bmuwatta\b/i, /\bmuwatta'\b/i],
  },
  riyadh: {
    canonical: 'Riyadh us-Saliheen',
    max: 1896,
    aliases: [/\briyadh\s*us-?salih(?:een|in)\b/i, /\briyad\s*as-?salih(?:een|in)\b/i, /\briyadhus-?salih(?:een|in)\b/i],
  },
};

const KNOWN_DUA_CATEGORIES = new Set([
  'waking', 'morning', 'evening', 'sleep', 'prayer', 'eating', 'travel',
  'distress', 'forgiveness', 'mosque', 'protection', 'dua_parents',
  'rain', 'knowledge', 'sickness', 'marriage', 'rizq', 'friday',
]);

// ─── Issue tracking ──────────────────────────────────────────────────────────

type Severity = 'ERROR' | 'WARNING' | 'INFO';

interface Issue {
  severity: Severity;
  file: string;
  category: string;          // validation category code (A–J)
  location: string;          // path inside file (e.g. "duas[3].arabic")
  message: string;
  detail?: string;
}

const issues: Issue[] = [];
const stats: Record<string, { entries: number; bytes: number }> = {};

function record(severity: Severity, file: string, category: string, location: string, message: string, detail?: string) {
  issues.push({ severity, file, category, location, message, detail });
}

// ─── ANSI colors ─────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function color(severity: Severity): string {
  if (severity === 'ERROR') return c.red;
  if (severity === 'WARNING') return c.yellow;
  return c.cyan;
}

function icon(severity: Severity): string {
  if (severity === 'ERROR') return '❌';
  if (severity === 'WARNING') return '⚠️';
  return 'ℹ️';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ARABIC_RANGES = [
  [0x0600, 0x06FF],
  [0x0750, 0x077F],
  [0xFB50, 0xFDFF],
  [0xFE70, 0xFEFF],
];

function hasArabicChars(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if (ARABIC_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) return true;
  }
  return false;
}

function isMostlyArabic(s: string): boolean {  // eslint-disable-line
  // strip whitespace, latin letters/digits, common punctuation, emoji
  const stripped = s.replace(/[\s\d\p{P}\p{S}\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu, '');
  if (!stripped.length) return false;
  let arabic = 0;
  for (const ch of stripped) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if (ARABIC_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) arabic++;
  }
  return arabic / [...stripped].length >= 0.7;
}

function readJson(file: string): unknown {
  const abs = path.join(process.cwd(), file);
  const buf = fs.readFileSync(abs);
  stats[file] = { entries: 0, bytes: buf.length };
  return JSON.parse(buf.toString('utf-8'));
}

function normalizeSurahName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`’]/g, '')
    .replace(/[-\s_]/g, '')
    .replace(/[ḥḫḳḷṣṭẓ]/g, m => ({ ḥ: 'h', ḫ: 'h', ḳ: 'k', ḷ: 'l', ṣ: 's', ṭ: 't', ẓ: 'z' }[m]!))
    .replace(/[āīū]/g, m => ({ ā: 'a', ī: 'i', ū: 'u' }[m]!))
    .replace(/[^a-z]/g, '');
}

// ─── CATEGORY B + I: Arabic text checks ──────────────────────────────────────

function validateArabic(file: string, location: string, text: string) {
  if (text == null || text === '') {
    record('ERROR', file, 'B', location, 'Arabic text is empty');
    return;
  }
  if (!hasArabicChars(text)) {
    record('ERROR', file, 'B', location, 'Arabic field contains no Arabic Unicode characters');
    return;
  }
  if (text.length < 2) {
    record('ERROR', file, 'B', location, `Arabic text suspiciously short (${text.length} chars)`, JSON.stringify(text));
  }
  if (text.length > 10000) {
    record('WARNING', file, 'B', location, `Arabic text very long (${text.length} chars) — verify intentional`);
  }
  if (!isMostlyArabic(text)) {
    record('WARNING', file, 'B', location, 'Arabic field contains substantial non-Arabic content');
  }
  // HTML / script injection
  if (/<\s*script\b/i.test(text)) {
    record('ERROR', file, 'B', location, 'Arabic text contains <script> tag');
  }
  if (/<[a-z][a-z0-9]*\b[^>]*>/i.test(text)) {
    record('WARNING', file, 'B', location, 'Arabic text contains raw HTML tags');
  }
  if (/&lt;|&gt;|&amp;[a-z]+;/i.test(text)) {
    record('WARNING', file, 'B', location, 'Arabic text contains HTML entities (likely encoding bug)');
  }
  // CATEGORY I: encoding
  if (text.includes('�')) {
    record('ERROR', file, 'I', location, 'Arabic text contains U+FFFD replacement character (broken encoding)');
  }
  if (/\t/.test(text)) {
    record('WARNING', file, 'I', location, 'Arabic text contains tab characters');
  }
  if (/ {3,}/.test(text)) {
    record('INFO', file, 'I', location, 'Arabic text contains 3+ consecutive spaces');
  }
  // Bidi control marks (LRM, RLM, LRE, RLE, PDF, LRO, RLO, FSI, LRI, RLI, PDI)
  if (/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/.test(text)) {
    record('INFO', file, 'I', location, 'Arabic text contains bidi control characters (may affect rendering)');
  }
}

// ─── CATEGORY D + E: reference parsing ───────────────────────────────────────

function validateReference(file: string, location: string, ref: string) {
  if (!ref || typeof ref !== 'string') return;

  // Hadith collections — dedupe across aliases (e.g. "Sahih Bukhari" + "Bukhari")
  // by (collection, span) so each citation is reported once.
  const seenSpans = new Set<string>();
  for (const key of Object.keys(HADITH_COLLECTIONS)) {
    const coll = HADITH_COLLECTIONS[key];
    for (const alias of coll.aliases) {
      const re = new RegExp(
        alias.source + String.raw`[\s,.:#]*(?:no\.?|#|hadith)?[\s,.:#]*(\d+)(?:\s*[\/]\s*(\d+))?`,
        'gi',
      );
      let m: RegExpExecArray | null;
      while ((m = re.exec(ref)) !== null) {
        const a = parseInt(m[1], 10);
        const b = m[2] ? parseInt(m[2], 10) : null;
        const candidates = b == null ? [a] : [a, b];
        const valid = candidates.some(n => n >= 1 && n <= coll.max);
        if (!valid) {
          const bothStr = b == null ? `${a}` : `${a}/${b}`;
          const dedupeKey = `${key}|${bothStr}`;
          if (seenSpans.has(dedupeKey)) continue;
          seenSpans.add(dedupeKey);
          record(
            'ERROR',
            file,
            'D',
            location,
            `Hadith reference out of range: "${coll.canonical} ${bothStr}" exceeds max ${coll.max}`,
            ref,
          );
        } else {
          // Mark valid spans too so a later alias doesn't re-flag if the digits also fail under a wider regex
          seenSpans.add(`${key}|${b == null ? a : `${a}/${b}`}`);
        }
      }
    }
  }

  // Quran references
  // Form 1: "Quran 2:255" or "Qur'an 2:255"
  const quranNum = /\bqur'?an\s+(\d{1,3}):(\d{1,3})\b/gi;
  let qm: RegExpExecArray | null;
  while ((qm = quranNum.exec(ref)) !== null) {
    const surah = parseInt(qm[1], 10);
    const ayah = parseInt(qm[2], 10);
    if (surah < 1 || surah > 114) {
      record('ERROR', file, 'E', location, `Quran surah ${surah} out of range (1–114)`, ref);
    } else if (ayah < 1 || ayah > QURAN_AYAH_COUNTS[surah - 1]) {
      record(
        'ERROR',
        file,
        'E',
        location,
        `Quran ${surah}:${ayah} — surah ${surah} only has ${QURAN_AYAH_COUNTS[surah - 1]} ayahs`,
        ref,
      );
    }
  }

  // Form 2: "Al-Baqarah 2:255" or "Al-Baqarah 255"
  // Look for known surah names followed by numbers
  const namedRefs = ref.matchAll(/\b([A-Z][a-zA-Z'’\-]+(?:\s+[A-Z][a-zA-Z'’\-]+)?)\s+(\d{1,3})(?::(\d{1,3}))?\b/g);
  for (const m of namedRefs) {
    const rawName = m[1];
    const norm = normalizeSurahName(rawName);
    const idx = SURAH_NAME_TO_INDEX[norm];
    if (!idx) continue;
    const a = parseInt(m[2], 10);
    const b = m[3] ? parseInt(m[3], 10) : null;
    const max = QURAN_AYAH_COUNTS[idx - 1];
    if (b != null) {
      // pattern "AlBaqarah 2:255" — first number should be surah index
      if (a !== idx) {
        record(
          'WARNING',
          file,
          'E',
          location,
          `Quran reference "${rawName} ${a}:${b}" — name maps to surah ${idx}, but cite uses surah ${a}`,
          ref,
        );
      }
      if (b < 1 || b > max) {
        record(
          'ERROR',
          file,
          'E',
          location,
          `Quran ${rawName} ${a}:${b} — surah ${idx} (${rawName}) only has ${max} ayahs`,
          ref,
        );
      }
    } else {
      // pattern "AlBaqarah 255" — number is the ayah
      if (a < 1 || a > max) {
        record(
          'ERROR',
          file,
          'E',
          location,
          `Quran ${rawName} ${a} — surah ${idx} only has ${max} ayahs`,
          ref,
        );
      }
    }
  }
}

// ─── CATEGORY A + G: hisnul_muslim.json ──────────────────────────────────────

function validateHisnulMuslim() {
  const FILE = 'assets/data/duas-core.json';
  let data: unknown;
  try {
    data = readJson(FILE);
  } catch (e: any) {
    record('ERROR', FILE, 'A', '<root>', 'JSON parse failed', String(e?.message ?? e));
    return;
  }
  if (!Array.isArray(data)) {
    record('ERROR', FILE, 'A', '<root>', 'Top-level must be an array of category groups');
    return;
  }

  const arabicSeen = new Map<string, string>(); // arabic → first location
  const idSeen = new Map<string, string>();
  let totalDuas = 0;

  for (let ci = 0; ci < data.length; ci++) {
    const cat = data[ci] as any;
    const catLoc = `[${ci}]`;
    if (!cat || typeof cat !== 'object') {
      record('ERROR', FILE, 'A', catLoc, 'Category entry is not an object');
      continue;
    }
    if (!cat.id || typeof cat.id !== 'string') {
      record('ERROR', FILE, 'G', `${catLoc}.id`, 'Category id missing or not a string');
    } else {
      // CATEGORY J: cross-file consistency
      if (!KNOWN_DUA_CATEGORIES.has(cat.id)) {
        record(
          'ERROR',
          FILE,
          'J',
          `${catLoc}.id`,
          `Category id "${cat.id}" not present in CATEGORY_ICONS (app/(tabs)/dua.tsx)`,
        );
      }
      if (idSeen.has(cat.id)) {
        record('ERROR', FILE, 'C', `${catLoc}.id`, `Duplicate category id "${cat.id}" — first at ${idSeen.get(cat.id)}`);
      } else {
        idSeen.set(cat.id, catLoc);
      }
    }
    if (!cat.title) record('WARNING', FILE, 'A', `${catLoc}.title`, 'Category title missing');
    if (!Array.isArray(cat.duas)) {
      record('ERROR', FILE, 'A', `${catLoc}.duas`, 'Category has no duas array');
      continue;
    }
    if (cat.duas.length === 0) {
      record('WARNING', FILE, 'J', `${catLoc}.duas`, `Category "${cat.id ?? '?'}" has 0 duas`);
    }

    for (let di = 0; di < cat.duas.length; di++) {
      totalDuas++;
      const dua = cat.duas[di] as any;
      const loc = `${catLoc}.duas[${di}]`;
      if (!dua || typeof dua !== 'object') {
        record('ERROR', FILE, 'A', loc, 'Dua entry is not an object');
        continue;
      }

      // Required: arabic
      if (!dua.arabic) {
        record('ERROR', FILE, 'G', `${loc}.arabic`, 'Dua missing arabic field');
      } else {
        validateArabic(FILE, `${loc}.arabic`, dua.arabic);
        // CATEGORY C: dedupe
        if (arabicSeen.has(dua.arabic)) {
          record(
            'WARNING',
            FILE,
            'C',
            `${loc}.arabic`,
            `Duplicate Arabic dua — first at ${arabicSeen.get(dua.arabic)}`,
          );
        } else {
          arabicSeen.set(dua.arabic, loc);
        }
      }

      // Required: english/translation
      const eng = dua.english ?? dua.translation;
      if (!eng) {
        record('ERROR', FILE, 'G', `${loc}.english`, 'Dua missing english/translation field');
      } else if (typeof eng !== 'string' || eng.trim() === '') {
        record('ERROR', FILE, 'G', `${loc}.english`, 'Dua english is empty');
      }

      // Optional: transliteration (warn)
      if (!dua.transliteration) {
        record('INFO', FILE, 'G', `${loc}.transliteration`, 'No transliteration provided');
      }

      // Optional: reference (warn if missing, validate if present)
      if (!dua.reference) {
        record('WARNING', FILE, 'G', `${loc}.reference`, 'Dua has no reference');
      } else {
        validateReference(FILE, `${loc}.reference`, dua.reference);
      }
    }
  }

  stats[FILE].entries = totalDuas;
}

// ─── CATEGORY A + H: dhikr.json ──────────────────────────────────────────────

function validateDhikr() {
  const FILE = 'assets/data/dhikr-core.json';
  let data: unknown;
  try {
    data = readJson(FILE);
  } catch (e: any) {
    record('ERROR', FILE, 'A', '<root>', 'JSON parse failed', String(e?.message ?? e));
    return;
  }
  if (!Array.isArray(data)) {
    record('ERROR', FILE, 'A', '<root>', 'Top-level must be an array of category groups');
    return;
  }

  const arabicSeen = new Map<string, string>();
  let totalItems = 0;

  for (let ci = 0; ci < data.length; ci++) {
    const cat = data[ci] as any;
    const catLoc = `[${ci}]`;
    if (!cat || typeof cat !== 'object') {
      record('ERROR', FILE, 'A', catLoc, 'Category entry is not an object');
      continue;
    }
    if (!cat.id) record('ERROR', FILE, 'H', `${catLoc}.id`, 'Category id missing');
    if (!Array.isArray(cat.items)) {
      record('ERROR', FILE, 'A', `${catLoc}.items`, 'Category has no items array');
      continue;
    }
    for (let di = 0; di < cat.items.length; di++) {
      totalItems++;
      const item = cat.items[di] as any;
      const loc = `${catLoc}.items[${di}]`;
      if (!item || typeof item !== 'object') {
        record('ERROR', FILE, 'A', loc, 'Dhikr entry is not an object');
        continue;
      }
      if (!item.arabic) {
        record('ERROR', FILE, 'H', `${loc}.arabic`, 'Dhikr missing arabic field');
      } else {
        validateArabic(FILE, `${loc}.arabic`, item.arabic);
        if (arabicSeen.has(item.arabic)) {
          record(
            'INFO',
            FILE,
            'C',
            `${loc}.arabic`,
            `Duplicate Arabic dhikr (may be intentional cross-category) — first at ${arabicSeen.get(item.arabic)}`,
          );
        } else {
          arabicSeen.set(item.arabic, loc);
        }
      }
      const eng = item.english ?? item.translation;
      if (!eng) {
        record('ERROR', FILE, 'H', `${loc}.english`, 'Dhikr missing english field');
      }
      // Count
      if (item.count == null) {
        record('ERROR', FILE, 'H', `${loc}.count`, 'Dhikr missing count');
      } else if (typeof item.count !== 'number' || !Number.isFinite(item.count)) {
        record('ERROR', FILE, 'H', `${loc}.count`, `Count is not a number: ${JSON.stringify(item.count)}`);
      } else if (item.count < 1 || item.count > 1000) {
        record('WARNING', FILE, 'H', `${loc}.count`, `Count ${item.count} outside reasonable range (1–1000)`);
      }
      if (!item.benefit) {
        record('WARNING', FILE, 'H', `${loc}.benefit`, 'Dhikr missing benefit field');
      }
      if (!item.reference) {
        record('WARNING', FILE, 'H', `${loc}.reference`, 'Dhikr has no reference');
      } else {
        validateReference(FILE, `${loc}.reference`, item.reference);
      }
    }
  }
  stats[FILE].entries = totalItems;
}

// ─── CATEGORY A + F: names_of_allah.json ─────────────────────────────────────

function validateNamesOfAllah() {
  const FILE = 'assets/data/names99.json';
  let data: unknown;
  try {
    data = readJson(FILE);
  } catch (e: any) {
    record('ERROR', FILE, 'A', '<root>', 'JSON parse failed', String(e?.message ?? e));
    return;
  }
  if (!Array.isArray(data)) {
    record('ERROR', FILE, 'A', '<root>', 'Top-level must be an array');
    return;
  }
  if (data.length !== 99 && data.length !== 100) {
    record('ERROR', FILE, 'F', '<root>', `Expected 99 (or 100 with Allah) names, got ${data.length}`);
  }
  const arabicSeen = new Map<string, number>();
  const idSeen = new Map<number, number>();
  for (let i = 0; i < data.length; i++) {
    const n = data[i] as any;
    const loc = `[${i}]`;
    if (!n || typeof n !== 'object') {
      record('ERROR', FILE, 'A', loc, 'Name entry is not an object');
      continue;
    }
    if (typeof n.id !== 'number') {
      record('ERROR', FILE, 'F', `${loc}.id`, 'id missing or not a number');
    } else if (idSeen.has(n.id)) {
      record('ERROR', FILE, 'C', `${loc}.id`, `Duplicate id ${n.id} — first at index ${idSeen.get(n.id)}`);
    } else {
      idSeen.set(n.id, i);
    }
    if (!n.arabic) {
      record('ERROR', FILE, 'F', `${loc}.arabic`, 'Arabic name missing');
    } else {
      validateArabic(FILE, `${loc}.arabic`, n.arabic);
      // CATEGORY F: starts with the Arabic definite article (alef + lam).
      // Accepts both Alef (\u0627) and Alef Wasla (\u0671). Downgraded to INFO
      // because multi-word names like "Malik al-Mulk" legitimately omit the prefix.
      const stripped = String(n.arabic).replace(/[\u064B-\u0652\u0670]/g, '');
      const startsWithAl = /^[\u0627\u0671]\u0644/.test(stripped);
      if (stripped !== '\u0627\u0644\u0644\u0647' && !startsWithAl) {
        record(
          'INFO',
          FILE,
          'F',
          `${loc}.arabic`,
          `Name "${n.arabic}" does not start with "\u0627\u0644" (Al-) — verify if multi-word construction (e.g. Malik al-Mulk)`,
        );
      }
      if (arabicSeen.has(n.arabic)) {
        record(
          'ERROR',
          FILE,
          'C',
          `${loc}.arabic`,
          `Duplicate Arabic name "${n.arabic}" — first at index ${arabicSeen.get(n.arabic)}`,
        );
      } else {
        arabicSeen.set(n.arabic, i);
      }
    }
    if (!n.transliteration) {
      record('ERROR', FILE, 'F', `${loc}.transliteration`, 'Transliteration missing');
    }
    if (!n.english_meaning) {
      record('ERROR', FILE, 'F', `${loc}.english_meaning`, 'English meaning missing');
    }
    if (n.quran_reference) {
      validateReference(FILE, `${loc}.quran_reference`, n.quran_reference);
    }
  }
  stats[FILE].entries = data.length;
}

// ─── Light validation for misc data files (structure + JSON only) ────────────

function validateGenericArray(file: string, requiredFields: string[]) {
  let data: unknown;
  try {
    data = readJson(file);
  } catch (e: any) {
    record('ERROR', file, 'A', '<root>', 'JSON parse failed', String(e?.message ?? e));
    return;
  }
  if (!Array.isArray(data)) {
    record('ERROR', file, 'A', '<root>', 'Top-level must be an array');
    return;
  }
  for (let i = 0; i < data.length; i++) {
    const e = data[i] as any;
    const loc = `[${i}]`;
    if (!e || typeof e !== 'object') {
      record('ERROR', file, 'A', loc, 'Entry is not an object');
      continue;
    }
    for (const f of requiredFields) {
      if (e[f] == null) {
        record('ERROR', file, 'A', `${loc}.${f}`, `Required field "${f}" missing`);
      }
    }
  }
  stats[file].entries = data.length;
}

function validateHadithsBundle() {
  const FILE = 'assets/hadiths.json';
  if (!fs.existsSync(path.join(process.cwd(), FILE))) return;
  let data: unknown;
  try {
    data = readJson(FILE);
  } catch (e: any) {
    record('ERROR', FILE, 'A', '<root>', 'JSON parse failed', String(e?.message ?? e));
    return;
  }
  if (!Array.isArray(data)) {
    record('ERROR', FILE, 'A', '<root>', 'Top-level must be an array');
    return;
  }
  for (let i = 0; i < data.length; i++) {
    const h = data[i] as any;
    const loc = `[${i}]`;
    if (!h || typeof h !== 'object') {
      record('ERROR', FILE, 'A', loc, 'Hadith entry is not an object');
      continue;
    }
    for (const f of ['id', 'collection', 'hadithNumber', 'hadithArabic', 'hadithEnglish']) {
      if (h[f] == null || h[f] === '') {
        record('ERROR', FILE, 'A', `${loc}.${f}`, `Required field "${f}" missing`);
      }
    }
    if (h.hadithArabic) validateArabic(FILE, `${loc}.hadithArabic`, h.hadithArabic);

    // Validate hadith number against collection cap
    const collKey = String(h.collection ?? '').toLowerCase().replace(/[^a-z]/g, '');
    const map: Record<string, keyof typeof HADITH_COLLECTIONS> = {
      sahihbukhari: 'bukhari',
      bukhari: 'bukhari',
      sahihmuslim: 'muslim',
      muslim: 'muslim',
      jamiattirmidhi: 'tirmidhi',
      tirmidhi: 'tirmidhi',
      sunanabudawud: 'abudawud',
      abudawud: 'abudawud',
      sunanibnmajah: 'ibnmajah',
      ibnmajah: 'ibnmajah',
      sunannasai: 'nasai',
      sunanannasai: 'nasai',
      nasai: 'nasai',
    };
    const k = map[collKey];
    if (k) {
      const num = parseInt(String(h.hadithNumber).match(/\d+/)?.[0] ?? '', 10);
      if (Number.isFinite(num)) {
        const max = HADITH_COLLECTIONS[k].max;
        if (num < 1 || num > max) {
          record(
            'ERROR',
            FILE,
            'D',
            `${loc}.hadithNumber`,
            `${HADITH_COLLECTIONS[k].canonical} #${num} exceeds max ${max}`,
          );
        }
      }
    }
  }
  stats[FILE].entries = data.length;
}

// ─── Hadith bulk files: parse + count only (cheap) ───────────────────────────

function validateHadithBulkFile(file: string, collKey: keyof typeof HADITH_COLLECTIONS) {
  if (!fs.existsSync(path.join(process.cwd(), file))) return;
  let data: any;
  try {
    data = readJson(file);
  } catch (e: any) {
    record('ERROR', file, 'A', '<root>', 'JSON parse failed', String(e?.message ?? e));
    return;
  }
  // These files are very large — be tolerant about top-level shape
  let arr: any[];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.hadiths)) arr = data.hadiths;
  else if (Array.isArray(data?.data)) arr = data.data;
  else {
    record('WARNING', file, 'A', '<root>', 'Unrecognized top-level shape — skipping per-entry checks');
    stats[file].entries = 0;
    return;
  }
  stats[file].entries = arr.length;
  const max = HADITH_COLLECTIONS[collKey].max;
  let outOfRange = 0;
  for (const h of arr) {
    const numRaw = h?.hadithNumber ?? h?.number ?? h?.idInBook ?? h?.id;
    const num = parseInt(String(numRaw).match(/\d+/)?.[0] ?? '', 10);
    if (Number.isFinite(num) && (num < 1 || num > max)) outOfRange++;
  }
  if (outOfRange > 0) {
    record(
      'ERROR',
      file,
      'D',
      '<entries>',
      `${outOfRange} hadith number(s) exceed ${HADITH_COLLECTIONS[collKey].canonical} max ${max}`,
    );
  }
}

// ─── Render output ───────────────────────────────────────────────────────────

function summary() {
  const errors = issues.filter(i => i.severity === 'ERROR').length;
  const warnings = issues.filter(i => i.severity === 'WARNING').length;
  const infos = issues.filter(i => i.severity === 'INFO').length;
  return { errors, warnings, infos };
}

function renderConsole() {
  console.log(`${c.bold}${c.cyan}═══ Islam Daily — Data Validation Scanner ═══${c.reset}\n`);

  console.log(`${c.bold}Files inspected:${c.reset}`);
  for (const [file, s] of Object.entries(stats)) {
    const sizeKB = (s.bytes / 1024).toFixed(1);
    console.log(`  ${c.dim}${file.padEnd(36)}${c.reset} ${String(s.entries).padStart(6)} entries  ${sizeKB.padStart(8)} KB`);
  }
  console.log();

  // Group issues by file
  const byFile = new Map<string, Issue[]>();
  for (const i of issues) {
    if (!byFile.has(i.file)) byFile.set(i.file, []);
    byFile.get(i.file)!.push(i);
  }

  for (const [file, list] of byFile) {
    console.log(`${c.bold}${file}${c.reset}  ${c.dim}(${list.length} issue${list.length === 1 ? '' : 's'})${c.reset}`);
    // Sort: ERROR > WARNING > INFO
    const order: Severity[] = ['ERROR', 'WARNING', 'INFO'];
    list.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
    const MAX_PER_FILE = 50;
    for (const issue of list.slice(0, MAX_PER_FILE)) {
      console.log(
        `  ${icon(issue.severity)} ${color(issue.severity)}[${issue.category}]${c.reset} ${c.dim}${issue.location}${c.reset}  ${issue.message}`,
      );
      if (issue.detail) {
        const trimmed = issue.detail.length > 200 ? issue.detail.slice(0, 200) + '…' : issue.detail;
        console.log(`     ${c.dim}↳ ${trimmed}${c.reset}`);
      }
    }
    if (list.length > MAX_PER_FILE) {
      console.log(`  ${c.dim}… and ${list.length - MAX_PER_FILE} more (see markdown report)${c.reset}`);
    }
    console.log();
  }

  const { errors, warnings, infos } = summary();
  console.log(`${c.bold}═══ Summary ═══${c.reset}`);
  console.log(`  ${c.red}❌ Errors:${c.reset}   ${errors}`);
  console.log(`  ${c.yellow}⚠️  Warnings:${c.reset} ${warnings}`);
  console.log(`  ${c.cyan}ℹ️  Info:${c.reset}     ${infos}`);
  console.log();
  if (errors === 0) {
    console.log(`${c.green}${c.bold}✅ No errors. Data integrity check passed.${c.reset}`);
  } else {
    console.log(`${c.red}${c.bold}❌ ${errors} error(s) found. Fix before shipping.${c.reset}`);
  }
}

function renderMarkdown(reportPath: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { errors, warnings, infos } = summary();

  const lines: string[] = [];
  lines.push(`# Islam Daily — Data Validation Report`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Scanner version:** 1.0`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| ❌ Errors  | ${errors} |`);
  lines.push(`| ⚠️ Warnings | ${warnings} |`);
  lines.push(`| ℹ️ Info     | ${infos} |`);
  lines.push('');
  lines.push(`**Result:** ${errors === 0 ? '✅ PASS' : '❌ FAIL'}`);
  lines.push('');

  lines.push(`## Files Inspected`);
  lines.push('');
  lines.push(`| File | Entries | Size |`);
  lines.push(`|------|--------:|-----:|`);
  for (const [file, s] of Object.entries(stats)) {
    lines.push(`| \`${file}\` | ${s.entries} | ${(s.bytes / 1024).toFixed(1)} KB |`);
  }
  lines.push('');

  lines.push(`## Validation Categories`);
  lines.push('');
  lines.push(`- **A** — JSON Structural`);
  lines.push(`- **B** — Arabic Text`);
  lines.push(`- **C** — Duplicate Detection`);
  lines.push(`- **D** — Hadith Reference`);
  lines.push(`- **E** — Quran Reference`);
  lines.push(`- **F** — 99 Names`);
  lines.push(`- **G** — Dua Structure`);
  lines.push(`- **H** — Dhikr Structure`);
  lines.push(`- **I** — Encoding Sanity`);
  lines.push(`- **J** — Cross-File Consistency`);
  lines.push('');

  // Issues grouped by file
  const byFile = new Map<string, Issue[]>();
  for (const i of issues) {
    if (!byFile.has(i.file)) byFile.set(i.file, []);
    byFile.get(i.file)!.push(i);
  }

  lines.push(`## Issues`);
  lines.push('');

  if (issues.length === 0) {
    lines.push(`_No issues found._`);
    lines.push('');
  } else {
    for (const [file, list] of byFile) {
      lines.push(`### \`${file}\`  (${list.length} issue${list.length === 1 ? '' : 's'})`);
      lines.push('');
      const order: Severity[] = ['ERROR', 'WARNING', 'INFO'];
      list.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
      lines.push(`| Severity | Cat | Location | Message |`);
      lines.push(`|----------|-----|----------|---------|`);
      for (const issue of list) {
        const sev = issue.severity === 'ERROR' ? '❌ ERR' : issue.severity === 'WARNING' ? '⚠️ WARN' : 'ℹ️ INFO';
        const msg = issue.message.replace(/\|/g, '\\|');
        const detail = issue.detail
          ? ` <br/><sub>↳ ${issue.detail.slice(0, 200).replace(/\|/g, '\\|').replace(/\n/g, ' ')}</sub>`
          : '';
        lines.push(`| ${sev} | ${issue.category} | \`${issue.location}\` | ${msg}${detail} |`);
      }
      lines.push('');
    }
  }

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
}

// ─── main ────────────────────────────────────────────────────────────────────

function main() {
  validateHisnulMuslim();
  validateDhikr();
  validateNamesOfAllah();
  validateGenericArray('assets/daily_knowledge.json', ['id', 'category', 'en']);
  validateGenericArray('assets/islamic_tips.json', ['id', 'title', 'tip']);
  validateHadithsBundle();
  validateHadithBulkFile('assets/hadiths/bukhari.json', 'bukhari');
  validateHadithBulkFile('assets/hadiths/muslim.json', 'muslim');
  validateHadithBulkFile('assets/hadiths/tirmidhi.json', 'tirmidhi');
  validateHadithBulkFile('assets/hadiths/abudawud.json', 'abudawud');
  validateHadithBulkFile('assets/hadiths/ibnmajah.json', 'ibnmajah');
  validateHadithBulkFile('assets/hadiths/nasai.json', 'nasai');

  renderConsole();

  // Write markdown report
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(reportsDir, `data-validation-${today}.md`);
  renderMarkdown(reportPath);
  console.log(`\n${c.dim}Markdown report written: ${path.relative(process.cwd(), reportPath)}${c.reset}`);

  const { errors } = summary();
  process.exit(errors > 0 ? 1 : 0);
}

main();
