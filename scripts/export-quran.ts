/**
 * One-shot exporter: pulls every ayah from Supabase `quran_ayahs` and writes
 * a flat JSON array to assets/data/quran.json so the app can bundle the Quran
 * instead of fetching it at runtime.
 *
 * Run: npx tsx scripts/export-quran.ts
 *
 * Idempotent — running it again just rewrites the same file with the same
 * content. Validates counts (6236 ayahs, pages 1..604 present, every row has
 * all required fields) before writing.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Reuse the same publishable key the app uses — it's safe in client code,
// safe in a build-time script.
const SUPABASE_URL = 'https://vchfykblowmrcvyaljxn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_B9WZesatOJ4wZc1ex3Gscg_2_CtEr1C';

const EXPECTED_AYAH_COUNT = 6236;
const TOTAL_PAGES = 604;
const PAGE_SIZE = 1000; // Supabase default max

const OUT_PATH = path.resolve(__dirname, '..', 'assets', 'data', 'quran.json');

interface SupabaseAyahRow {
  surah_number: number;
  ayah_number: number;
  text_indopak: string | null;
  arabic_text: string | null;
  urdu_translation: string | null;
  english_translation: string | null;
  page_indopak: number | null;
}

interface BundledAyah {
  s: number;          // surah_number
  a: number;          // ayah_number
  p: number;          // page_indopak
  ti: string;         // text_indopak (the canonical render for the Mushaf view)
  ta: string;         // arabic_text (Tanzil Uthmani, used by Translation tab)
  tu: string;         // urdu_translation
  te: string;         // english_translation
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log(`Connecting to ${SUPABASE_URL}…`);

  const all: SupabaseAyahRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('quran_ayahs')
      .select(
        'surah_number, ayah_number, text_indopak, arabic_text, urdu_translation, english_translation, page_indopak',
      )
      .order('surah_number', { ascending: true })
      .order('ayah_number', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(
        `Supabase fetch failed (range ${from}-${to}): ${error.message}.\n` +
        `If the project is paused, log into Supabase and wake it up, then re-run.`,
      );
    }
    if (!data || data.length === 0) break;

    all.push(...(data as SupabaseAyahRow[]));
    console.log(`  fetched ${all.length} / ${EXPECTED_AYAH_COUNT}`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // ── Validate ─────────────────────────────────────────────────────────────
  if (all.length !== EXPECTED_AYAH_COUNT) {
    throw new Error(
      `Wrong ayah count: expected ${EXPECTED_AYAH_COUNT}, got ${all.length}`,
    );
  }

  const missingFields: string[] = [];
  const pageSet = new Set<number>();
  for (const row of all) {
    if (
      row.surah_number == null ||
      row.ayah_number == null ||
      row.page_indopak == null ||
      !row.text_indopak ||
      !row.arabic_text
    ) {
      missingFields.push(`surah ${row.surah_number} ayah ${row.ayah_number}`);
    }
    if (row.page_indopak != null) pageSet.add(row.page_indopak);
  }
  if (missingFields.length > 0) {
    throw new Error(
      `Rows with missing required fields: ${missingFields.slice(0, 5).join(', ')}…`,
    );
  }

  const missingPages: number[] = [];
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    if (!pageSet.has(p)) missingPages.push(p);
  }
  if (missingPages.length > 0) {
    throw new Error(
      `Pages missing from data: ${missingPages.slice(0, 10).join(', ')}` +
      (missingPages.length > 10 ? `… (+${missingPages.length - 10} more)` : ''),
    );
  }

  // ── Normalize to a compact shape ─────────────────────────────────────────
  // Use short keys (s/a/p/ti/ta/tu/te) — JSON is going into the APK, so
  // every kilobyte saved on field names matters. The runtime loader expands
  // these back into the verbose shape the rest of the code expects.
  const bundled: BundledAyah[] = all.map((row) => ({
    s: row.surah_number,
    a: row.ayah_number,
    p: row.page_indopak!,
    ti: row.text_indopak!,
    ta: row.arabic_text!,
    tu: row.urdu_translation ?? '',
    te: row.english_translation ?? '',
  }));

  // ── Write ─────────────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(bundled), 'utf8');
  const sizeMb = (fs.statSync(OUT_PATH).size / 1_048_576).toFixed(2);

  console.log('');
  console.log('✅ Export complete');
  console.log(`   File:   ${path.relative(process.cwd(), OUT_PATH)}`);
  console.log(`   Size:   ${sizeMb} MB`);
  console.log(`   Ayahs:  ${bundled.length}`);
  console.log(`   Pages:  ${pageSet.size} (expected ${TOTAL_PAGES})`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
