/**
 * One-time populate: fill the `urdu_translation` column in Supabase
 * `quran_ayahs` with the full Maulana Fateh Muhammad Jalandhri translation.
 *
 *     set SUPABASE_SERVICE_KEY=<service-role-key>
 *     npx tsx scripts/populate-urdu-jalandhry.ts
 *
 * Source: alquran.cloud /v1/quran/ur.jalandhry (one-shot request, all 6,236
 * ayahs in a single payload).
 *
 * Idempotent — running it again rewrites the same Urdu text. Validates the
 * source returns exactly 6,236 ayahs, applies batched UPDATEs by (surah, ayah),
 * and verifies the post-state with `SELECT count(*) … WHERE urdu_translation
 * IS NULL` before exiting.
 *
 * Why a service key: anon/publishable role can read this table but RLS blocks
 * writes — confirmed by probe. Matches the pattern in seedDailyKnowledgeAyahs.ts.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://vchfykblowmrcvyaljxn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error(
    '[populate-urdu] SUPABASE_SERVICE_KEY env var is required.\n' +
      'Get it from Supabase dashboard → Project Settings → API → service_role key.\n' +
      'Then re-run:  set SUPABASE_SERVICE_KEY=...; npx tsx scripts/populate-urdu-jalandhry.ts',
  );
  process.exit(1);
}

const EXPECTED_AYAH_COUNT = 6236;
const BATCH_SIZE = 100;
const JALANDHRY_URL = 'https://api.alquran.cloud/v1/quran/ur.jalandhry';
const SOURCE_TIMEOUT_MS = 60_000;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Source types (alquran.cloud /v1/quran/{edition}) ─────────────────────────

interface AlquranAyah {
  number: number;          // global ayah number 1..6236
  text: string;            // translation text
  numberInSurah: number;
  surah: { number: number };
}
interface AlquranSurah {
  number: number;
  ayahs: AlquranAyah[];
}
interface AlquranQuranResponse {
  code: number;
  status: string;
  data: { surahs: AlquranSurah[]; edition: { identifier: string; name: string } };
}

interface FlatAyah {
  surah: number;
  ayah: number;
  text: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJalandhry(): Promise<FlatAyah[]> {
  console.log(`Fetching ${JALANDHRY_URL}…`);
  const res = await fetchWithTimeout(JALANDHRY_URL, SOURCE_TIMEOUT_MS);
  if (!res.ok) {
    throw new Error(`alquran.cloud returned HTTP ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as AlquranQuranResponse;
  if (json.code !== 200 || !json.data?.surahs) {
    throw new Error(`alquran.cloud returned code ${json.code} / no surahs`);
  }
  const edition = json.data.edition?.identifier;
  if (edition !== 'ur.jalandhry') {
    throw new Error(
      `Expected edition ur.jalandhry, got "${edition}". Refusing to populate.`,
    );
  }

  const flat: FlatAyah[] = [];
  for (const s of json.data.surahs) {
    for (const a of s.ayahs) {
      const text = typeof a.text === 'string' ? a.text.trim() : '';
      if (!text) {
        throw new Error(
          `Empty translation at ${s.number}:${a.numberInSurah} — refusing to populate.`,
        );
      }
      flat.push({ surah: s.number, ayah: a.numberInSurah, text });
    }
  }
  return flat;
}

async function lookupRowIds(): Promise<Map<string, number>> {
  // Build (surah,ayah) → id map by paging through the table; UPDATE-by-id
  // is faster + immune to schema-level ambiguity than UPDATE-by-(surah,ayah).
  const PAGE = 1000;
  const map = new Map<string, number>();
  let from = 0;
  while (true) {
    const to = from + PAGE - 1;
    const { data, error } = await supabase
      .from('quran_ayahs')
      .select('id, surah_number, ayah_number')
      .order('id')
      .range(from, to);
    if (error) throw new Error(`id-lookup failed at range ${from}-${to}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      map.set(`${row.surah_number}:${row.ayah_number}`, row.id);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch source translation
  const flat = await fetchJalandhry();
  if (flat.length !== EXPECTED_AYAH_COUNT) {
    throw new Error(
      `Source has ${flat.length} ayahs, expected ${EXPECTED_AYAH_COUNT}. Aborting.`,
    );
  }
  console.log(`  ✓ source has ${flat.length} ayahs`);

  // 2. Resolve surah/ayah → row id from Supabase
  console.log('Resolving row ids from Supabase…');
  const idByKey = await lookupRowIds();
  if (idByKey.size !== EXPECTED_AYAH_COUNT) {
    throw new Error(
      `Supabase has ${idByKey.size} rows, expected ${EXPECTED_AYAH_COUNT}. Aborting.`,
    );
  }
  console.log(`  ✓ ${idByKey.size} rows resolved`);

  // 3. Cross-check every source ayah has a matching row
  const missing: string[] = [];
  for (const f of flat) {
    if (!idByKey.has(`${f.surah}:${f.ayah}`)) {
      missing.push(`${f.surah}:${f.ayah}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `No row for: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? `… (+${missing.length - 5})` : ''}`,
    );
  }

  // 4. Per-row UPDATEs, parallelized in batches. Supabase upsert can't be
  // used here because PostgREST's INSERT ... ON CONFLICT path still requires
  // every NOT NULL column on the INSERT side even when we expect the UPDATE
  // branch to fire — and we only have id + urdu_translation. Running
  // BATCH_SIZE updates concurrently keeps the round-trip count high but the
  // wall clock manageable (~1 minute total for 6,236 rows).
  console.log(`Updating in batches of ${BATCH_SIZE}…`);
  let updated = 0;
  for (let i = 0; i < flat.length; i += BATCH_SIZE) {
    const slice = flat.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      slice.map((f) =>
        supabase
          .from('quran_ayahs')
          .update({ urdu_translation: f.text })
          .eq('id', idByKey.get(`${f.surah}:${f.ayah}`)!),
      ),
    );
    for (let j = 0; j < results.length; j++) {
      const { error } = results[j];
      if (error) {
        const f = slice[j];
        throw new Error(`Update ${f.surah}:${f.ayah} failed: ${error.message}`);
      }
    }
    updated += slice.length;
    if (updated % 1000 === 0 || updated === flat.length) {
      console.log(`  updated ${updated} / ${flat.length}`);
    }
  }

  // 5. Verify post-state — every row must now have a non-null urdu_translation.
  console.log('Verifying…');
  const { count: nullCount, error: nullErr } = await supabase
    .from('quran_ayahs')
    .select('id', { count: 'exact', head: true })
    .is('urdu_translation', null);
  if (nullErr) throw new Error(`Verify (null count) failed: ${nullErr.message}`);
  if (nullCount !== 0) {
    throw new Error(
      `Verification failed: ${nullCount} rows still have urdu_translation IS NULL.`,
    );
  }

  const { count: filledCount, error: filledErr } = await supabase
    .from('quran_ayahs')
    .select('id', { count: 'exact', head: true })
    .not('urdu_translation', 'is', null);
  if (filledErr) throw new Error(`Verify (filled count) failed: ${filledErr.message}`);
  if (filledCount !== EXPECTED_AYAH_COUNT) {
    throw new Error(
      `Verification failed: ${filledCount} rows non-null, expected ${EXPECTED_AYAH_COUNT}.`,
    );
  }

  console.log('');
  console.log('✅ Populate complete');
  console.log(`   Rows updated:        ${updated}`);
  console.log(`   urdu_translation IS NULL:     0`);
  console.log(`   urdu_translation IS NOT NULL: ${filledCount}`);

  // 6. Spot-check a handful of well-known ayahs so the user can eyeball that
  // the translator is correct (Maulana Fateh Muhammad Jalandhri, not someone
  // else's translation that happened to be aliased to ur.jalandhry).
  const SPOT_REFS: Array<[number, number]> = [
    [1, 1], [2, 255], [18, 10], [36, 1], [55, 13],
    [67, 1], [78, 1], [89, 27], [112, 1], [114, 6],
  ];
  console.log('');
  console.log('— Spot-check (verify these read like Maulana Jalandhri\'s Urdu) —');
  for (const [s, a] of SPOT_REFS) {
    const { data, error } = await supabase
      .from('quran_ayahs')
      .select('urdu_translation')
      .eq('surah_number', s)
      .eq('ayah_number', a)
      .single();
    if (error) {
      console.log(`  ${s}:${a}  ERROR ${error.message}`);
      continue;
    }
    console.log(`  ${s}:${a}  ${data?.urdu_translation ?? '(null)'}`);
  }
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
