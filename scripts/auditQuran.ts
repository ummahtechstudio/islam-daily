/**
 * Islam Daily — Phase Q.3.1 comprehensive Quran audit
 *
 * Connects to Supabase and runs a battery of integrity / special-case /
 * page-distribution / juz-mapping / surah-metadata checks. Prints a tagged
 * report; exits 1 if any check fails so it can be wired into CI later.
 *
 * Run:
 *   npx tsx scripts/auditQuran.ts
 */

import { createClient } from '@supabase/supabase-js';
import { SURAH_META } from '../src/constants/surahMeta';
import { pageToJuz } from '../src/utils/quranNav';

const SUPABASE_URL = 'https://vchfykblowmrcvyaljxn.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  'sb_publishable_B9WZesatOJ4wZc1ex3Gscg_2_CtEr1C';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type AyahRow = {
  surah_number: number;
  ayah_number: number;
  text_indopak: string | null;
  page_indopak: number | null;
};

const PASS = '✅';
const FAIL = '❌';

let failures = 0;

function check(label: string, ok: boolean, detail?: string) {
  const tag = ok ? PASS : FAIL;
  console.log(`${tag} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// IndoPak source uses Private Use Area (U+E000–U+F8FF) glyphs as invisible
// layout markers (e.g. a trailing U+F500 after 2:1). Build the regex via
// String.fromCharCode so no PUA literal ends up in this source file.
const PUA_RE = new RegExp(
  '[' + String.fromCharCode(0xe000) + '-' + String.fromCharCode(0xf8ff) + ']',
  'g',
);

// Strip Arabic harakat / sukun / shadda / tanween / superscripts / sajdah
// marks / tatweel — anything that would prevent a substring match against
// canonical bare letters like "بسم" or "الم".
//   U+064B–U+065F  fatha/kasra/damma/tanween/sukun/shadda…
//   U+0670         superscript alif
//   U+06D6–U+06ED  small high marks, sajdah, hamza wasl, etc.
//   U+0640         tatweel
const DIACRITIC_RE = new RegExp(
  '[' +
    String.fromCharCode(0x064b) + '-' + String.fromCharCode(0x065f) +
    String.fromCharCode(0x0670) +
    String.fromCharCode(0x06d6) + '-' + String.fromCharCode(0x06ed) +
    String.fromCharCode(0x0640) +
  ']',
  'g',
);

function stripPUA(s: string): string {
  return s.replace(PUA_RE, '');
}

function stripDiacritics(s: string): string {
  return stripPUA(s).replace(DIACRITIC_RE, '');
}

/** Strip diacritics + PUA + all whitespace — produces a canonical bare-letter form. */
function canonicalize(s: string): string {
  return stripDiacritics(s).replace(/\s+/g, '');
}

async function fetchAllAyahs(): Promise<AyahRow[]> {
  const PAGE = 1000;
  const out: AyahRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('quran_ayahs')
      .select('surah_number, ayah_number, text_indopak, page_indopak')
      .order('surah_number', { ascending: true })
      .order('ayah_number', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...(data as AyahRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function main() {
  console.log('=== Islam Daily — Quran Audit Report ===');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('');

  const rows = await fetchAllAyahs();

  // ─── DATA INTEGRITY ────────────────────────────────────────────────────
  console.log('DATA INTEGRITY');

  check(
    `Total ayah count: ${rows.length}`,
    rows.length === 6236,
    rows.length === 6236 ? undefined : `expected 6236, got ${rows.length}`,
  );

  const nullText = rows.filter(
    (r) => r.text_indopak == null || r.text_indopak === '',
  );
  check(
    'No null/empty text_indopak',
    nullText.length === 0,
    nullText.length === 0
      ? undefined
      : `${nullText.length} rows missing IndoPak text (e.g. ${nullText
          .slice(0, 3)
          .map((r) => `${r.surah_number}:${r.ayah_number}`)
          .join(', ')})`,
  );

  const nullPage = rows.filter((r) => r.page_indopak == null);
  check(
    'No null page_indopak',
    nullPage.length === 0,
    nullPage.length === 0
      ? undefined
      : `${nullPage.length} rows missing page (e.g. ${nullPage
          .slice(0, 3)
          .map((r) => `${r.surah_number}:${r.ayah_number}`)
          .join(', ')})`,
  );

  const pages = rows
    .map((r) => r.page_indopak)
    .filter((p): p is number => p != null);
  const minPage = Math.min(...pages);
  const maxPage = Math.max(...pages);
  check(
    `Page range: ${minPage}–${maxPage}`,
    minPage === 1 && maxPage === 604,
    minPage === 1 && maxPage === 604 ? undefined : 'expected 1–604',
  );

  // Per-surah ayah counts vs canonical
  const dbCountBySurah = new Map<number, number>();
  for (const r of rows) {
    dbCountBySurah.set(
      r.surah_number,
      (dbCountBySurah.get(r.surah_number) ?? 0) + 1,
    );
  }
  const mismatched: string[] = [];
  for (const meta of SURAH_META) {
    const have = dbCountBySurah.get(meta.number) ?? 0;
    if (have !== meta.ayah_count) {
      mismatched.push(
        `surah ${meta.number} (${meta.name_english}): have ${have}, expected ${meta.ayah_count}`,
      );
    }
  }
  check(
    'Per-surah ayah counts match surahMeta',
    mismatched.length === 0,
    mismatched.length === 0
      ? `all 114 surahs match`
      : `${mismatched.length} mismatch(es): ${mismatched.slice(0, 3).join(' | ')}${mismatched.length > 3 ? ' …' : ''}`,
  );

  // Surah numbering continuity
  const missingSurahs: number[] = [];
  for (let s = 1; s <= 114; s++) {
    if (!dbCountBySurah.has(s)) missingSurahs.push(s);
  }
  check(
    'All 114 surahs present',
    missingSurahs.length === 0,
    missingSurahs.length === 0
      ? undefined
      : `missing: ${missingSurahs.join(', ')}`,
  );

  console.log('');

  // ─── SPECIAL CASES ─────────────────────────────────────────────────────
  console.log('SPECIAL CASES');

  const fatihaRows = rows.filter((r) => r.surah_number === 1);
  check(
    `Al-Faatiha has ${fatihaRows.length} ayahs`,
    fatihaRows.length === 7,
    fatihaRows.length === 7 ? undefined : 'expected 7',
  );

  const tawbah1 = rows.find(
    (r) => r.surah_number === 9 && r.ayah_number === 1,
  );
  const tawbahCanon = canonicalize(tawbah1?.text_indopak ?? '');
  const tawbahStartsWithBismillah = tawbahCanon.startsWith('بسم');
  check(
    'At-Tawbah 9:1 does NOT start with Bismillah',
    tawbah1 != null && !tawbahStartsWithBismillah,
    tawbah1
      ? `9:1 starts with "${stripDiacritics(tawbah1.text_indopak ?? '').trim().slice(0, 14)}…"`
      : 'row 9:1 missing',
  );

  const naml30 = rows.find(
    (r) => r.surah_number === 27 && r.ayah_number === 30,
  );
  const naml30Text = naml30?.text_indopak ?? '';
  const naml30Stripped = stripDiacritics(naml30Text);
  const namlContainsBismillah = naml30Stripped.includes('بسم');
  check(
    'An-Naml 27:30 contains inline Bismillah',
    namlContainsBismillah,
    namlContainsBismillah ? undefined : 'substring "بسم" not found',
  );
  if (naml30) {
    console.log(`   Text preview: "${naml30Text}"`);
  }

  const baqarah1 = rows.find(
    (r) => r.surah_number === 2 && r.ayah_number === 1,
  );
  const baqarah1Canon = canonicalize(baqarah1?.text_indopak ?? '');
  check(
    `Al-Baqarah 2:1 is "Alif Lam Mim"`,
    baqarah1Canon === 'الم',
    baqarah1
      ? `got "${baqarah1Canon}" (raw: "${baqarah1?.text_indopak}")`
      : 'row 2:1 missing',
  );

  const nasRows = rows.filter((r) => r.surah_number === 114);
  const nas6 = nasRows.find((r) => r.ayah_number === 6);
  const nasOnLastPage = nas6?.page_indopak === 604;
  check(
    `An-Nas has 6 ayahs and ends on page 604`,
    nasRows.length === 6 && nasOnLastPage,
    nasRows.length === 6
      ? nasOnLastPage
        ? undefined
        : `last ayah on page ${nas6?.page_indopak}`
      : `expected 6 ayahs, got ${nasRows.length}`,
  );

  console.log('');

  // ─── PAGE DISTRIBUTION ─────────────────────────────────────────────────
  console.log('PAGE DISTRIBUTION');

  const surahsByPage = new Map<number, Set<number>>();
  const countByPage = new Map<number, number>();
  for (const r of rows) {
    if (r.page_indopak == null) continue;
    countByPage.set(r.page_indopak, (countByPage.get(r.page_indopak) ?? 0) + 1);
    if (!surahsByPage.has(r.page_indopak)) {
      surahsByPage.set(r.page_indopak, new Set());
    }
    surahsByPage.get(r.page_indopak)!.add(r.surah_number);
  }
  const emptyPages: number[] = [];
  for (let p = 1; p <= 604; p++) {
    if (!countByPage.has(p)) emptyPages.push(p);
  }
  check(
    'All 604 pages populated',
    emptyPages.length === 0,
    emptyPages.length === 0
      ? undefined
      : `empty: ${emptyPages.slice(0, 8).join(', ')}${emptyPages.length > 8 ? ' …' : ''}`,
  );

  let multiSurahPageCount = 0;
  for (const [, set] of surahsByPage) {
    if (set.size >= 2) multiSurahPageCount++;
  }
  check(
    `${multiSurahPageCount} pages contain multiple surahs (juz 30 cluster)`,
    multiSurahPageCount > 0,
    multiSurahPageCount > 0 ? undefined : 'expected at least one multi-surah page',
  );

  console.log('');

  // ─── JUZ MAPPING ───────────────────────────────────────────────────────
  console.log('JUZ MAPPING');

  const juzSamples: Array<{ page: number; expected: number }> = [
    { page: 1, expected: 1 },
    { page: 22, expected: 2 },
    { page: 42, expected: 3 },
    { page: 62, expected: 4 },
    { page: 282, expected: 15 },
    { page: 582, expected: 30 },
    { page: 604, expected: 30 },
  ];
  const juzMismatches: string[] = [];
  for (const { page, expected } of juzSamples) {
    const actual = pageToJuz(page);
    if (actual !== expected) {
      juzMismatches.push(`page ${page}: expected juz ${expected}, got ${actual}`);
    }
  }
  check(
    `${juzSamples.length} sample boundaries`,
    juzMismatches.length === 0,
    juzMismatches.length === 0
      ? 'all correct'
      : juzMismatches.join(' | '),
  );

  console.log('');

  // ─── SURAH METADATA ────────────────────────────────────────────────────
  console.log('SURAH METADATA');

  check(
    `${SURAH_META.length} entries in surahMeta`,
    SURAH_META.length === 114,
    SURAH_META.length === 114 ? undefined : `expected 114, got ${SURAH_META.length}`,
  );

  const incompleteEntries: string[] = [];
  for (const m of SURAH_META) {
    if (
      !m.name_arabic ||
      !m.name_english ||
      !m.name_urdu ||
      typeof m.ayah_count !== 'number' ||
      m.ayah_count <= 0 ||
      (m.revelation_place !== 'makkah' && m.revelation_place !== 'madinah')
    ) {
      incompleteEntries.push(String(m.number));
    }
  }
  check(
    'Each entry has all required fields',
    incompleteEntries.length === 0,
    incompleteEntries.length === 0
      ? undefined
      : `incomplete: ${incompleteEntries.join(', ')}`,
  );

  const totalMetaAyahs = SURAH_META.reduce((s, m) => s + m.ayah_count, 0);
  check(
    `Total ayahs in surahMeta: ${totalMetaAyahs}`,
    totalMetaAyahs === 6236,
    totalMetaAyahs === 6236 ? undefined : 'expected 6236',
  );

  const makki = SURAH_META.filter((m) => m.revelation_place === 'makkah').length;
  const madani = SURAH_META.filter((m) => m.revelation_place === 'madinah').length;
  // Standard split is 86/28; allow ±2 since traditions vary on a handful.
  const splitOk = Math.abs(makki - 86) <= 2 && Math.abs(madani - 28) <= 2;
  check(
    `Revelation places: ${makki} Makkiyyah, ${madani} Madaniyyah`,
    splitOk,
    splitOk ? undefined : 'expected ~86 Makki / ~28 Madani',
  );

  console.log('');

  // ─── RESULT ────────────────────────────────────────────────────────────
  if (failures === 0) {
    console.log('=== RESULT: ALL CHECKS PASSED ===');
  } else {
    console.log(`=== RESULT: ${failures} CHECK(S) FAILED ===`);
  }

  console.log('');
  printSpotCheckList();

  if (failures > 0) process.exit(1);
}

function printSpotCheckList() {
  console.log('🔍 Visual Spot-Check Checklist (after npx expo start, press w)');
  console.log('');
  console.log('Open Quran tab → Recite tab. For each item, scroll/jump to the page and verify:');
  console.log('');
  console.log('PAGE 1 — Surah Al-Faatiha');
  console.log('  □ Surah header banner shows once');
  console.log('  □ Bismillah appears EXACTLY ONCE (not twice)');
  console.log('  □ 7 ayahs visible with gold pill markers ١ ٢ ٣ ٤ ٥ ٦ ٧');
  console.log('');
  console.log('PAGE 2 — Start of Surah Al-Baqarah');
  console.log('  □ Surah header banner appears');
  console.log('  □ Bismillah header appears');
  console.log('  □ First ayah is "الم" (Alif Lam Mim)');
  console.log('');
  console.log('PAGE 22 — Start of Juz 2');
  console.log('  □ Floating indicator changes to "Juz 2"');
  console.log('');
  console.log('PAGE 187 — Start of Surah Yasin (or wherever Yasin starts)');
  console.log('  □ New surah header appears mid-page (if Yasin starts mid-page)');
  console.log('  □ Bismillah header appears');
  console.log('');
  console.log('PAGE 235 — Start of Surah At-Tawbah (surah 9)');
  console.log('  □ Surah header banner appears');
  console.log('  □ NO Bismillah header (this is the only surah without one)');
  console.log('');
  console.log('PAGE 377 — Surah An-Naml around ayah 30');
  console.log('  □ Look for ayah 30 — it should contain "بسم الله الرحمن الرحيم"');
  console.log('    INSIDE the ayah (not as a separator)');
  console.log('');
  console.log('PAGE 600+ — Juz 30 (Juz Amma)');
  console.log('  □ Multiple short surahs per page render correctly');
  console.log('  □ Each new surah has its own header + Bismillah (except surah 9)');
  console.log('');
  console.log('PAGE 604 — Last page (Surah An-Nas)');
  console.log('  □ Surah An-Nas appears as the final surah');
  console.log('  □ Floating indicator shows "Page 604 / 604 · Juz 30"');
  console.log('');
  console.log('INTERACTION');
  console.log('  □ Tap A+ a few times → text grows, page grows taller, no clipping');
  console.log('  □ Tap A− → text shrinks correctly, persists after refresh');
  console.log('  □ Tap floating page pill → "Jump to" modal opens, type 50 → jumps');
  console.log('  □ Search "Yasin" in jump modal → tap → goes to page 440 (or wherever it is)');
  console.log('  □ Switch to Translation tab → existing surah list works unchanged');
  console.log('  □ Tap Al-Faatiha from Translation list → Urdu reader opens unchanged');
  console.log('  □ Switch to Listen tab → reciter placeholder displays');
  console.log('  □ Close app → reopen → returns to Recite tab + last scroll position');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
