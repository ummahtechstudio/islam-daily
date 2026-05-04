/**
 * One-shot helper: exports the latest small content tables from Supabase to
 * `assets/data/*.json` so the app can render instantly from bundled content.
 *
 * Run manually after updating Supabase content; commit the resulting files.
 *
 *   set SUPABASE_SERVICE_KEY=<service-role-key>
 *   npx tsx scripts/exportBundledContent.ts
 *
 * Notes:
 * - Dhikr has no Supabase table → bundled `dhikr-core.json` is curated by hand.
 * - Duas are stored flat in Supabase; this script groups them by category to
 *   match the runtime shape.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://vchfykblowmrcvyaljxn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error(
    '[export] SUPABASE_SERVICE_KEY env var is required. ' +
      'Get it from Supabase dashboard → Project Settings → API → service_role key.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const OUT_DIR = path.join(__dirname, '..', 'assets', 'data');

async function exportNames() {
  const { data, error } = await supabase
    .from('names_of_allah')
    .select('id, number, arabic, transliteration, english_meaning, urdu_meaning, quran_reference, dua')
    .order('id');
  if (error) throw error;
  if (!data?.length) {
    console.warn('[export] names_of_allah: 0 rows — skipping write');
    return 0;
  }
  const out = path.join(OUT_DIR, 'names99.json');
  fs.writeFileSync(out, JSON.stringify(data, null, 2));
  console.log(`[export] names99.json: ${data.length} rows`);
  return data.length;
}

async function exportDuas() {
  const { data, error } = await supabase
    .from('duas')
    .select('id, category, title, arabic, transliteration, urdu, english, source')
    .order('id');
  if (error) throw error;
  if (!data?.length) {
    console.warn('[export] duas: 0 rows — skipping write');
    return 0;
  }

  // Group flat rows into DuaCategory[] shape
  const byCategory = new Map<string, { id: string; title: string; icon: string; duas: any[] }>();
  for (const row of data) {
    if (!byCategory.has(row.category)) {
      byCategory.set(row.category, {
        id: row.category,
        title: row.title,
        icon: '',
        duas: [],
      });
    }
    byCategory.get(row.category)!.duas.push({
      arabic: row.arabic,
      transliteration: row.transliteration ?? '',
      english: row.english,
      urdu: row.urdu ?? undefined,
      reference: row.source ?? '',
    });
  }

  const out = path.join(OUT_DIR, 'duas-core.json');
  fs.writeFileSync(out, JSON.stringify(Array.from(byCategory.values()), null, 2));
  console.log(`[export] duas-core.json: ${data.length} duas across ${byCategory.size} categories`);
  return data.length;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const names = await exportNames();
  const duas = await exportDuas();
  console.log('[export] note: dhikr-core.json is curated locally; not exported.');
  console.log(`[export] done. names=${names} duas=${duas}`);
}

main().catch((err) => {
  console.error('[export] failed:', err);
  process.exit(1);
});
