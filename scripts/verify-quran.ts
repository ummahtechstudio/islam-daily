/**
 * Islam Daily — Quran verification script
 *
 * Compares every ayah in our Supabase quran_ayahs table against the official
 * Tanzil uthmani text, character by character. Optionally auto-fixes mismatches.
 *
 * Run:
 *   npx tsx scripts/verify-quran.ts            # compare only
 *   npx tsx scripts/verify-quran.ts --fix       # compare + auto-fix in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://vchfykblowmrcvyaljxn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_B9WZesatOJ4wZc1ex3Gscg_2_CtEr1C';

/** Ordered list of Tanzil JSON sources to try (first success wins). */
const TANZIL_SOURCES = [
  // Primary: Tanzil.net direct download
  'https://tanzil.net/pub/download/index.php?quranType=quran-uthmani&outType=json&agree=true',
  // Mirror 1: standalone quran-json repo
  'https://raw.githubusercontent.com/risan/quran-json/main/data/quran.json',
  // Mirror 2: fawazahmed0 quran-api
  'https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/quran-uthmani.json',
];

const REPORT_DIR  = path.join(__dirname, '../reports');
const REPORT_FILE = path.join(REPORT_DIR, 'quran-verification.txt');

const PAGE_SIZE = 1000; // Supabase max rows per request

// ─── Types ────────────────────────────────────────────────────────────────────

interface TanzilAyah {
  surah: number;
  ayah:  number;
  text:  string;
}

interface DbAyah {
  id:           number;
  surah_number: number;
  ayah_number:  number;
  arabic_text:  string;
}

interface Mismatch {
  surah:     number;
  ayah:      number;
  dbId:      number;
  tanzilText: string;
  ourText:    string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(msg + '\n');
}

function progress(msg: string) {
  process.stdout.write(`\r${msg}`.padEnd(80));
}

/** Fetch text from a URL, return null on failure. */
async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Islam-Daily-Verify/1.0' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ─── Tanzil download ──────────────────────────────────────────────────────────

/**
 * Normalise whatever JSON shape the source returns into a flat TanzilAyah[].
 *
 * Known shapes:
 *  A. { quran: [ { index, surah, ayah, text } ] }          ← Tanzil.net
 *  B. [ { chapter: N, verse: N, text: "..." } ]             ← risan/quran-json
 *  C. { chapters: [ { id, verses: [ { id, text } ] } ] }   ← islamic-network
 *  D. Flat array: [ { surah, ayah, text } ]
 */
function normaliseTanzil(raw: any): TanzilAyah[] {
  // Shape A — { quran: [...] }
  if (raw && Array.isArray(raw.quran)) {
    return raw.quran.map((a: any) => ({
      surah: Number(a.surah),
      ayah:  Number(a.ayah),
      text:  String(a.text),
    }));
  }

  // Shape C — { chapters: [ { id, verses: [ { id, text } ] } ] }
  if (raw && Array.isArray(raw.chapters)) {
    const result: TanzilAyah[] = [];
    for (const ch of raw.chapters) {
      for (const v of ch.verses ?? []) {
        result.push({ surah: Number(ch.id), ayah: Number(v.id), text: String(v.text) });
      }
    }
    return result;
  }

  // Shape B / D — flat array
  if (Array.isArray(raw)) {
    return raw.map((a: any) => ({
      surah: Number(a.surah ?? a.chapter),
      ayah:  Number(a.ayah  ?? a.verse),
      text:  String(a.text),
    }));
  }

  // Shape E — risan/quran-json: { "1": [{chapter, verse, text}], "2": [...], ... }
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw['1']) {
    const result: TanzilAyah[] = [];
    for (const surahKey of Object.keys(raw)) {
      const verses = raw[surahKey];
      if (!Array.isArray(verses)) continue;
      for (const v of verses) {
        result.push({
          surah: Number(v.chapter ?? surahKey),
          ayah:  Number(v.verse),
          text:  String(v.text),
        });
      }
    }
    if (result.length > 0) return result;
  }

  throw new Error('Unrecognised Tanzil JSON shape — update normaliseTanzil()');
}

async function downloadTanzil(): Promise<Map<string, TanzilAyah>> {
  log('Downloading Tanzil uthmani text…');

  for (const url of TANZIL_SOURCES) {
    log(`  Trying: ${url}`);
    const text = await fetchText(url);
    if (!text) {
      log('  → failed (no response)');
      continue;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      log('  → failed (invalid JSON)');
      continue;
    }

    let ayahs: TanzilAyah[];
    try {
      ayahs = normaliseTanzil(parsed);
    } catch (e: any) {
      log(`  → failed (${e.message})`);
      continue;
    }

    if (ayahs.length < 6000) {
      log(`  → suspicious: only ${ayahs.length} ayahs — skipping`);
      continue;
    }

    log(`  → success: ${ayahs.length} ayahs loaded from ${url}`);

    // Build lookup map  "surah:ayah" → TanzilAyah
    const map = new Map<string, TanzilAyah>();
    for (const a of ayahs) {
      map.set(`${a.surah}:${a.ayah}`, a);
    }
    return map;
  }

  throw new Error('All Tanzil sources failed. Check your internet connection.');
}

// ─── Supabase download ────────────────────────────────────────────────────────

async function downloadFromSupabase(): Promise<DbAyah[]> {
  log('Downloading quran_ayahs from Supabase…');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const all: DbAyah[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    progress(`  Fetching rows ${from + 1}–${to + 1}…`);

    const { data, error } = await supabase
      .from('quran_ayahs')
      .select('id, surah_number, ayah_number, arabic_text')
      .order('surah_number', { ascending: true })
      .order('ayah_number',  { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Supabase error: ${error.message}`);
    if (!data || data.length === 0) break;

    all.push(...(data as DbAyah[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  process.stdout.write('\n');
  log(`  ${all.length} ayahs downloaded from Supabase.`);
  return all;
}

// ─── Comparison ───────────────────────────────────────────────────────────────

function compareAyahs(
  tanzil: Map<string, TanzilAyah>,
  db: DbAyah[],
): Mismatch[] {
  log('Comparing ayahs…');
  const mismatches: Mismatch[] = [];

  for (const row of db) {
    const key = `${row.surah_number}:${row.ayah_number}`;
    const ref = tanzil.get(key);

    if (!ref) {
      // Ayah exists in DB but not in Tanzil — unusual, log as mismatch with empty tanzil text
      mismatches.push({
        surah:      row.surah_number,
        ayah:       row.ayah_number,
        dbId:       row.id,
        tanzilText: '(not found in Tanzil)',
        ourText:    row.arabic_text,
      });
      continue;
    }

    if (ref.text !== row.arabic_text) {
      mismatches.push({
        surah:      row.surah_number,
        ayah:       row.ayah_number,
        dbId:       row.id,
        tanzilText: ref.text,
        ourText:    row.arabic_text,
      });
    }

    if (db.indexOf(row) % 500 === 0) {
      progress(`  Checked ${db.indexOf(row) + 1}/${db.length}…`);
    }
  }

  process.stdout.write('\n');
  return mismatches;
}

// ─── Auto-fix ─────────────────────────────────────────────────────────────────

async function autoFix(mismatches: Mismatch[], tanzil: Map<string, TanzilAyah>) {
  if (mismatches.length === 0) return;

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  log(`\nAuto-fixing ${mismatches.length} mismatches in Supabase…`);

  let fixed = 0;
  let failed = 0;

  for (const m of mismatches) {
    const tanzilAyah = tanzil.get(`${m.surah}:${m.ayah}`);
    if (!tanzilAyah || tanzilAyah.text === '(not found in Tanzil)') {
      log(`  SKIP  ${m.surah}:${m.ayah} — no Tanzil text to fix with`);
      continue;
    }

    const { error } = await supabase
      .from('quran_ayahs')
      .update({ arabic_text: tanzilAyah.text })
      .eq('id', m.dbId);

    if (error) {
      log(`  FAIL  ${m.surah}:${m.ayah} — ${error.message}`);
      failed++;
    } else {
      progress(`  Fixed ${++fixed}/${mismatches.length}…`);
    }
  }

  process.stdout.write('\n');
  log(`Auto-fix complete: ${fixed} fixed, ${failed} failed.`);
}

// ─── Report ───────────────────────────────────────────────────────────────────

function writeReport(
  db: DbAyah[],
  mismatches: Mismatch[],
  fixed: boolean,
) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const total    = db.length;
  const matched  = total - mismatches.length;
  const accuracy = total > 0 ? ((matched / total) * 100).toFixed(4) : '0.0000';

  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════════',
    '  Islam Daily — Quran Verification Report',
    `  Generated: ${new Date().toISOString()}`,
    '═══════════════════════════════════════════════════════════════════',
    '',
    `  Source   : Tanzil uthmani (official)`,
    `  Database : Supabase quran_ayahs`,
    '',
    `  Total ayahs checked : ${total}`,
    `  Matches             : ${matched}`,
    `  Mismatches          : ${mismatches.length}`,
    `  Accuracy            : ${accuracy}%`,
    fixed ? `  Auto-fix applied    : YES` : `  Auto-fix applied    : NO (re-run with --fix to apply)`,
    '',
    '───────────────────────────────────────────────────────────────────',
  ];

  if (mismatches.length === 0) {
    lines.push('  ✓ All ayahs match Tanzil perfectly. No differences found.');
  } else {
    lines.push(`  MISMATCHES (${mismatches.length}):`);
    lines.push('');

    for (const m of mismatches) {
      lines.push(`  Surah ${m.surah}, Ayah ${m.ayah}  (DB id=${m.dbId})`);
      lines.push(`    Tanzil : ${m.tanzilText}`);
      lines.push(`    Ours   : ${m.ourText}`);
      lines.push('');
    }
  }

  lines.push('═══════════════════════════════════════════════════════════════════');

  const content = lines.join('\n') + '\n';
  fs.writeFileSync(REPORT_FILE, content, 'utf-8');
  return content;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const doFix   = args.includes('--fix');

  log('');
  log('Islam Daily — Quran Verification');
  log('══════════════════════════════════════════════════════════════════');
  if (doFix) log('Mode: COMPARE + AUTO-FIX');
  else       log('Mode: COMPARE ONLY  (pass --fix to auto-fix mismatches)');
  log('');

  try {
    const [tanzilMap, dbAyahs] = await Promise.all([
      downloadTanzil(),
      downloadFromSupabase(),
    ]);

    log('');
    const mismatches = compareAyahs(tanzilMap, dbAyahs);

    // Summary to console
    const total    = dbAyahs.length;
    const matched  = total - mismatches.length;
    const accuracy = total > 0 ? ((matched / total) * 100).toFixed(4) : '0.0000';

    log('');
    log('──────────────────────────────────────────────────────────────────');
    log(`  Total checked  : ${total}`);
    log(`  Matches        : ${matched}`);
    log(`  Mismatches     : ${mismatches.length}`);
    log(`  Accuracy       : ${accuracy}%`);
    log('──────────────────────────────────────────────────────────────────');

    if (mismatches.length > 0) {
      log('');
      log('First 10 mismatches:');
      for (const m of mismatches.slice(0, 10)) {
        log(`  Surah ${m.surah}:${m.ayah}`);
        log(`    Tanzil : ${m.tanzilText.slice(0, 80)}`);
        log(`    Ours   : ${m.ourText.slice(0, 80)}`);
      }
      if (mismatches.length > 10) {
        log(`  … and ${mismatches.length - 10} more (see full report)`);
      }
    }

    if (doFix) {
      await autoFix(mismatches, tanzilMap);
    }

    const report = writeReport(dbAyahs, mismatches, doFix);
    log('');
    log(`Report saved to: ${REPORT_FILE}`);

    process.exit(mismatches.length > 0 && !doFix ? 1 : 0);
  } catch (err: any) {
    log(`\nFATAL: ${err?.message ?? err}`);
    process.exit(2);
  }
}

main();
