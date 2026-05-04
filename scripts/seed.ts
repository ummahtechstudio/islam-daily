/**
 * Islam Daily — Supabase seed script
 *
 * Seeds: hadiths, duas, names_of_allah, quran_ayahs
 *
 * Prerequisites:
 *   npm install -D tsx
 *
 * Run:
 *   npx tsx scripts/seed.ts
 *
 * This is a one-time operation. Re-running will upsert existing rows.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://vchfykblowmrcvyaljxn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_B9WZesatOJ4wZc1ex3Gscg_2_CtEr1C';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

async function upsertBatch(table: string, rows: any[], idField = 'id') {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: idField });
    if (error) {
      console.error(`Error upserting into ${table}:`, error.message);
      throw error;
    }
    log(`  ${table}: upserted rows ${i + 1}–${Math.min(i + CHUNK, rows.length)}`);
  }
}

// ─── Seed hadiths ─────────────────────────────────────────────────────────────

async function seedHadiths() {
  log('Seeding hadiths...');
  const raw = fs.readFileSync(
    path.join(__dirname, '../assets/hadiths.json'),
    'utf-8'
  );
  const hadiths: any[] = JSON.parse(raw);

  const rows = hadiths.map((h) => ({
    id: h.id,
    collection: h.collection,
    book_name: h.bookName,
    hadith_number: String(h.hadithNumber),
    arabic_text: h.hadithArabic || null,
    urdu_text: null,
    english_text: h.hadithEnglish,
    narrator: h.narrator || null,
    grade: h.grade || null,
  }));

  await upsertBatch('hadiths', rows);
  log(`Hadiths seeded: ${rows.length} records`);
}

// ─── Seed duas ────────────────────────────────────────────────────────────────

async function seedDuas() {
  log('Seeding duas...');
  const raw = fs.readFileSync(
    path.join(__dirname, '../assets/data/duas-core.json'),
    'utf-8'
  );
  const categories: any[] = JSON.parse(raw);

  const rows: any[] = [];
  let id = 1;

  for (const cat of categories) {
    for (const dua of cat.duas) {
      rows.push({
        id,
        category: cat.id,
        title: cat.title,
        arabic: dua.arabic,
        transliteration: dua.transliteration || null,
        urdu: null,
        english: dua.english,
        source: dua.reference || null,
        audio_url: null,
      });
      id++;
    }
  }

  await upsertBatch('duas', rows);
  log(`Duas seeded: ${rows.length} records across ${categories.length} categories`);
}

// ─── Seed 99 Names of Allah ───────────────────────────────────────────────────

async function seedNames() {
  log('Seeding 99 Names of Allah from local asset...');
  const raw = fs.readFileSync(
    path.join(__dirname, '../assets/data/names99.json'),
    'utf-8'
  );
  const names: any[] = JSON.parse(raw);

  const rows = names.map((n) => ({
    id: n.id,
    number: n.number,
    arabic: n.arabic,
    transliteration: n.transliteration,
    english_meaning: n.english_meaning,
    urdu_meaning: n.urdu_meaning ?? null,
    quran_reference: n.quran_reference ?? null,
    dua: n.dua ?? null,
  }));

  await upsertBatch('names_of_allah', rows);
  log(`Names seeded: ${rows.length} records`);
}

// ─── Seed Quran ayahs ─────────────────────────────────────────────────────────
// Fetches from alquran.cloud: Arabic (uthmani) + English (Asad)
// This inserts 6236 rows — may take several minutes due to 114 API calls.

async function seedQuran() {
  log('Seeding Quran ayahs (114 surahs from alquran.cloud)...');
  log('This may take 3–5 minutes depending on your connection.');

  let globalId = 1;

  for (let surah = 1; surah <= 114; surah++) {
    const url = `https://api.alquran.cloud/v1/surah/${surah}/editions/quran-uthmani,en.asad`;
    let retries = 3;
    let json: any = null;

    while (retries > 0) {
      try {
        const res = await fetch(url);
        json = await res.json();
        if (json.code === 200) break;
      } catch {}
      retries--;
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!json || json.code !== 200) {
      console.error(`  Failed to fetch surah ${surah} after retries — skipping`);
      continue;
    }

    const [arabicEdition, englishEdition] = json.data;
    const rows: any[] = [];

    for (let i = 0; i < arabicEdition.ayahs.length; i++) {
      const ar = arabicEdition.ayahs[i];
      const en = englishEdition.ayahs[i];
      rows.push({
        id: globalId++,
        surah_number: surah,
        ayah_number: ar.numberInSurah,
        arabic_text: ar.text,
        urdu_translation: null,
        english_translation: en?.text ?? null,
        juz: ar.juz,
        page: ar.page,
      });
    }

    await upsertBatch('quran_ayahs', rows);
    process.stdout.write(`  Surah ${surah}/114 — ${rows.length} ayahs\n`);

    // Brief pause to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  log('Quran seeding complete.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const all = args.length === 0 || args.includes('--all');

  try {
    if (all || args.includes('--hadiths')) await seedHadiths();
    if (all || args.includes('--duas'))    await seedDuas();
    if (all || args.includes('--names'))   await seedNames();
    if (all || args.includes('--quran'))   await seedQuran();

    log('\nAll done! Your Supabase database is seeded.');
    log('Now run the app and use Downloads → Download All to cache data offline.');
  } catch (err: any) {
    console.error('\n[seed] Fatal error:', err?.message ?? err);
    process.exit(1);
  }
}

main();
