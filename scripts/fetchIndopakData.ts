/**
 * Islam Daily — Fetch IndoPak Nastaleeq script + 16-line page mapping
 *
 * Populates `quran_ayahs.text_indopak` and `quran_ayahs.page_indopak` for all
 * 6,236 ayahs.
 *
 * Sources:
 *   1. `scripts/data/indopak.json` (manual download from QUL — qul.tarteel.ai
 *      resource 59, "Quran Script: IndoPak Nastaleeq"). This export is
 *      *word-level* (~83k entries keyed by `surah:ayah:word`) and contains
 *      ONLY text — no page numbers. We aggregate words → ayahs.
 *   2. Quran.com API (api.qurancdn.com) — used to populate page_indopak,
 *      since the QUL script export does not include page mapping.
 *
 * Prerequisites:
 *   1. Run the SQL migration first:
 *      supabase/migrations/add_indopak_columns_to_quran_ayahs.sql
 *   2. Set the service role key (anon role can't write to quran_ayahs):
 *      $env:SUPABASE_SERVICE_KEY="<key>"   (PowerShell)
 *
 * Run:
 *   npx tsx scripts/fetchIndopakData.ts
 *
 * Safe to re-run — updates by (surah_number, ayah_number) match.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://vchfykblowmrcvyaljxn.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  'sb_publishable_B9WZesatOJ4wZc1ex3Gscg_2_CtEr1C';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LOCAL_JSON_PATH = path.join(__dirname, 'data', 'indopak.json');
const QURANCDN_BASE = 'https://api.qurancdn.com/api/qdc/verses/by_chapter';

type AyahRow = {
  surah: number;
  ayah: number;
  text_indopak: string;
  page_indopak: number | null;
};

function log(msg: string) {
  console.log(`[indopak] ${msg}`);
}

function parseSurahAyah(e: any): { surah: number; ayah: number } | null {
  if (typeof e.verse_key === 'string') {
    const [s, a] = e.verse_key.split(':').map(Number);
    if (s && a) return { surah: s, ayah: a };
  }
  if (typeof e.location === 'string') {
    const parts = e.location.split(':').map(Number);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { surah: parts[0], ayah: parts[1] };
    }
  }
  if (e.surah != null && e.ayah != null) {
    const s = Number(e.surah);
    const a = Number(e.ayah);
    if (s && a) return { surah: s, ayah: a };
  }
  if (e.surah_number != null && e.ayah_number != null) {
    const s = Number(e.surah_number);
    const a = Number(e.ayah_number);
    if (s && a) return { surah: s, ayah: a };
  }
  return null;
}

function getText(e: any): string {
  return (
    e.text_indopak_nastaleeq ??
    e.qpc_nastaleeq ??
    e.text_indopak ??
    e.text ??
    e.arabic ??
    ''
  );
}

function getPage(e: any): number | null {
  const p = e.page_number ?? e.page ?? e.page_indopak ?? e.mushaf_page;
  if (p == null) return null;
  const n = Number(p);
  return Number.isFinite(n) ? n : null;
}

function getWordPosition(e: any): number {
  const w = e.word ?? e.word_position ?? e.word_number ?? e.position ?? 0;
  return Number(w);
}

function loadLocalAyahs(): AyahRow[] {
  if (!fs.existsSync(LOCAL_JSON_PATH)) {
    throw new Error(
      `Local file missing: ${LOCAL_JSON_PATH}\n` +
        `Download from https://qul.tarteel.ai/resources/quran-script/59 (click "Download json").`,
    );
  }
  log(`Reading local file: ${LOCAL_JSON_PATH}`);
  const raw = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, 'utf-8'));

  // Unwrap to array of entries — handle every common QUL/Quran-data shape
  let entries: any[];
  if (Array.isArray(raw)) {
    entries = raw;
  } else if (raw.data && Array.isArray(raw.data)) {
    entries = raw.data;
  } else if (raw.verses && Array.isArray(raw.verses)) {
    entries = raw.verses;
  } else if (raw.words && Array.isArray(raw.words)) {
    entries = raw.words;
  } else if (raw && typeof raw === 'object') {
    entries = Object.values(raw);
  } else {
    throw new Error(`Unrecognized JSON shape (root: ${typeof raw}).`);
  }

  log(`Loaded ${entries.length} entries from JSON.`);

  // Sample first entry to confirm field detection
  if (entries.length > 0) {
    log(`First entry fields: ${Object.keys(entries[0]).join(', ')}`);
  }

  const isWordLevel = entries.length > 20000;
  log(
    `Granularity: ${isWordLevel ? 'word-level (aggregating to ayahs)' : 'ayah-level (using directly)'}`,
  );

  if (isWordLevel) {
    const grouped = new Map<
      string,
      { word: number; text: string; page: number | null }[]
    >();
    let skipped = 0;
    for (const e of entries) {
      const sa = parseSurahAyah(e);
      if (!sa) {
        skipped++;
        continue;
      }
      const text = getText(e);
      if (!text) {
        skipped++;
        continue;
      }
      const key = `${sa.surah}:${sa.ayah}`;
      let arr = grouped.get(key);
      if (!arr) {
        arr = [];
        grouped.set(key, arr);
      }
      arr.push({ word: getWordPosition(e), text, page: getPage(e) });
    }
    if (skipped > 0) log(`  skipped ${skipped} unparseable entries`);

    const rows: AyahRow[] = [];
    for (const [key, words] of grouped.entries()) {
      const [s, a] = key.split(':').map(Number);
      words.sort((x, y) => x.word - y.word);
      const joined = words.map((w) => w.text).join(' ');
      const page = words.find((w) => w.page != null)?.page ?? null;
      rows.push({
        surah: s,
        ayah: a,
        text_indopak: joined,
        page_indopak: page,
      });
    }
    rows.sort((x, y) => x.surah - y.surah || x.ayah - y.ayah);
    return rows;
  }

  // Ayah-level path
  const rows: AyahRow[] = [];
  let skipped = 0;
  for (const e of entries) {
    const sa = parseSurahAyah(e);
    if (!sa) {
      skipped++;
      continue;
    }
    const text = getText(e);
    if (!text) {
      skipped++;
      continue;
    }
    rows.push({
      surah: sa.surah,
      ayah: sa.ayah,
      text_indopak: text,
      page_indopak: getPage(e),
    });
  }
  if (skipped > 0) log(`  skipped ${skipped} unparseable entries`);
  rows.sort((x, y) => x.surah - y.surah || x.ayah - y.ayah);
  return rows;
}

async function fetchPagesFromQuranCdn(): Promise<Map<string, number>> {
  log('Fetching IndoPak page numbers from Quran.com API (114 surahs)...');
  const pages = new Map<string, number>();
  for (let surah = 1; surah <= 114; surah++) {
    const url = `${QURANCDN_BASE}/${surah}?words=false&fields=page_number&per_page=300`;
    let attempt = 0;
    let json: any = null;
    while (attempt < 3) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          json = await res.json();
          break;
        }
      } catch {
        // retry
      }
      attempt++;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 800));
    }
    if (!json?.verses?.length) {
      log(`  failed to fetch surah ${surah} after 3 retries`);
      continue;
    }
    for (const v of json.verses) {
      if (v.verse_key && v.page_number != null) {
        pages.set(v.verse_key, Number(v.page_number));
      }
    }
    if (surah % 10 === 0 || surah === 114) {
      process.stdout.write(
        `\r  fetched surah ${surah}/114 (${pages.size} pages so far)   `,
      );
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  process.stdout.write('\n');
  return pages;
}

async function main() {
  log('Starting IndoPak parser + Supabase update...');

  const ayahs = loadLocalAyahs();
  log(`Aggregated to ${ayahs.length} ayahs.`);
  if (ayahs.length !== 6236) {
    log(`WARNING: expected 6236 ayahs, got ${ayahs.length}.`);
  }

  const missingText = ayahs.filter((a) => !a.text_indopak.trim()).length;
  if (missingText > 0) log(`WARNING: ${missingText} ayahs have empty text.`);

  const sample = ayahs.find((a) => a.surah === 1 && a.ayah === 1);
  if (sample) log(`Sample — Surah 1 Ayah 1: "${sample.text_indopak}"`);

  // Pages: if local data lacks them, fetch from Quran.com API
  const haveAnyPages = ayahs.some((a) => a.page_indopak != null);
  if (!haveAnyPages) {
    log('Local file has no page numbers — fetching from Quran.com API.');
    const pageMap = await fetchPagesFromQuranCdn();
    let matched = 0;
    for (const a of ayahs) {
      const p = pageMap.get(`${a.surah}:${a.ayah}`);
      if (p != null) {
        a.page_indopak = p;
        matched++;
      }
    }
    log(`Matched ${matched}/${ayahs.length} ayahs to page numbers.`);
  }

  const pageVals = ayahs
    .map((a) => a.page_indopak)
    .filter((p): p is number => p != null);
  if (pageVals.length > 0) {
    const minP = Math.min(...pageVals);
    const maxP = Math.max(...pageVals);
    log(`Page range: ${minP}–${maxP} (${pageVals.length} ayahs with pages).`);
  } else {
    log('No page numbers available — page_indopak will be null.');
  }

  // Bulk update via parallel batches
  log(`Updating ${ayahs.length} rows in quran_ayahs...`);
  let updated = 0;
  let failed = 0;
  let zeroMatch = 0;
  const BATCH = 50;
  let lastLogged = 0;

  for (let i = 0; i < ayahs.length; i += BATCH) {
    const batch = ayahs.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((a) =>
        supabase
          .from('quran_ayahs')
          .update({
            text_indopak: a.text_indopak,
            page_indopak: a.page_indopak,
          })
          .eq('surah_number', a.surah)
          .eq('ayah_number', a.ayah)
          .select('id'),
      ),
    );
    for (let j = 0; j < results.length; j++) {
      const { data, error } = results[j];
      if (error) {
        failed++;
        if (failed <= 5) {
          log(`  ${batch[j].surah}:${batch[j].ayah} failed: ${error.message}`);
        }
      } else if (!data || data.length === 0) {
        zeroMatch++;
        if (zeroMatch <= 5) {
          log(`  ${batch[j].surah}:${batch[j].ayah} matched 0 rows`);
        }
      } else {
        updated++;
      }
    }

    const processed = Math.min(i + BATCH, ayahs.length);
    if (
      Math.floor(processed / 500) > Math.floor(lastLogged / 500) ||
      processed === ayahs.length
    ) {
      log(
        `  progress: ${processed}/${ayahs.length} (${updated} ok, ${zeroMatch} no-match, ${failed} failed)`,
      );
      lastLogged = processed;
    }
  }

  log('');
  log(
    `Summary: ${updated} updated, ${zeroMatch} no-match, ${failed} failed (of ${ayahs.length}).`,
  );
  if (zeroMatch > 0) {
    log(
      `${zeroMatch} ayahs had no matching row in quran_ayahs — verify the table is fully populated.`,
    );
  }
  if (failed > 0) {
    log('Some rows failed — check errors above. If RLS-related, set SUPABASE_SERVICE_KEY.');
  }
}

main().catch((err: any) => {
  console.error(`\n[indopak] Fatal: ${err?.message ?? err}`);
  process.exit(1);
});
