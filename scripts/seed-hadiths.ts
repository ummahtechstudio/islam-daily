/**
 * Seed hadiths from downloaded JSON files into Supabase.
 *
 * Prerequisites:
 *   1. Run: npx tsx scripts/download-hadiths.ts
 *   2. Run the new hadiths schema SQL in Supabase Dashboard (scripts/supabase_schema.sql)
 *
 * Run:
 *   npx tsx scripts/seed-hadiths.ts
 *
 * Optional — if RLS blocks inserts, set the service role key:
 *   SUPABASE_SERVICE_KEY=<key> npx tsx scripts/seed-hadiths.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://vchfykblowmrcvyaljxn.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  'sb_publishable_B9WZesatOJ4wZc1ex3Gscg_2_CtEr1C';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COLLECTIONS = [
  { file: 'bukhari.json',  key: 'bukhari',  name: 'Sahih Bukhari' },
  { file: 'muslim.json',   key: 'muslim',   name: 'Sahih Muslim' },
  { file: 'tirmidhi.json', key: 'tirmidhi', name: 'Jami at-Tirmidhi' },
  { file: 'abudawud.json', key: 'abudawud', name: 'Sunan Abu Dawud' },
  { file: 'ibnmajah.json', key: 'ibnmajah', name: 'Sunan Ibn Majah' },
  { file: 'nasai.json',    key: 'nasai',    name: "Sunan an-Nasa'i" },
];

async function seedCollection(
  file: string,
  key: string,
  name: string,
): Promise<number> {
  const filePath = path.join(__dirname, '../assets/hadiths', file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} not found. Run download-hadiths.ts first.`);
  }

  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const rawList: any[] = Array.isArray(json) ? json : (json.hadiths ?? []);

  if (rawList.length === 0) throw new Error(`No hadiths parsed from ${file}`);

  // Debug: show first hadith structure so we can verify parsing
  console.log(`  [debug] first hadith keys: ${Object.keys(rawList[0]).join(', ')}`);

  const rows = rawList.map((h: any) => {
    const englishObj = typeof h.english === 'object' && h.english !== null ? h.english : null;
    return {
      collection_key: key,
      collection_name: name,
      book_id:      h.bookId    != null ? parseInt(String(h.bookId))    : null,
      book_name:    h.book?.name ?? null,
      chapter_id:   h.chapterId != null ? parseInt(String(h.chapterId)) : null,
      chapter_name: h.chapter?.title ?? null,
      hadith_number: String(h.idInBook ?? h.reference?.hadith ?? h.id ?? ''),
      arabic:    h.arabic   ?? null,
      english:   englishObj?.text ?? (typeof h.english === 'string' ? h.english : null),
      narrator:  englishObj?.narrator ?? h.narrator ?? null,
      grade:     h.grades?.[0]?.grade ?? h.grade ?? 'Sahih',
    };
  });

  // Clear existing rows for this collection before re-seeding
  const { error: delErr } = await supabase
    .from('hadiths')
    .delete()
    .eq('collection_key', key);
  if (delErr) throw new Error(`Delete failed for ${key}: ${delErr.message}`);

  const CHUNK = 500;
  let seeded = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('hadiths').insert(chunk);
    if (error) throw new Error(`Insert failed for ${key}: ${error.message}`);
    seeded += chunk.length;
    process.stdout.write(`\r  Seeding ${name}... ${seeded}/${rows.length}`);
  }
  console.log(); // newline after progress
  return rows.length;
}

async function main() {
  console.log('Starting hadith seed...\n');
  let total = 0;

  for (const col of COLLECTIONS) {
    console.log(`Seeding ${col.name}...`);
    try {
      const count = await seedCollection(col.file, col.key, col.name);
      total += count;
    } catch (err: any) {
      console.error(`  ERROR: ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\nDone! ${total.toLocaleString()} hadiths seeded across ${COLLECTIONS.length} collections.`);
}

main();
