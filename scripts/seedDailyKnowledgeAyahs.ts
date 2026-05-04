/**
 * Phase D.1 — Seed 30 days of `daily_knowledge` from well-known Quran ayahs.
 *
 * Pulls the IndoPak Nastaleeq text + Urdu/English translations from the
 * existing `quran_ayahs` table and upserts one row per day for the next
 * 30 days. Idempotent — safe to re-run; uses upsert by display_date.
 *
 *     set SUPABASE_SERVICE_KEY=<service-role-key>
 *     npx tsx scripts/seedDailyKnowledgeAyahs.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://vchfykblowmrcvyaljxn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error(
    '[seed-knowledge] SUPABASE_SERVICE_KEY env var is required. ' +
      'Get it from Supabase dashboard → Project Settings → API → service_role key.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Curated 30 well-known impactful ayahs ────────────────────────────────────
// Ordered so each successive day surfaces a different theme.

interface AyahRange {
  surah: number;
  start: number;
  end: number; // inclusive; equals start for single-ayah entries
  note: string;
}

const PICKS: AyahRange[] = [
  { surah: 1,   start: 1, end: 1,   note: 'Bismillah (the opening)' },
  { surah: 1,   start: 2, end: 2,   note: 'Al-hamdu lillahi rabbil-alameen' },
  { surah: 2,   start: 255, end: 255, note: 'Ayat al-Kursi' },
  { surah: 2,   start: 286, end: 286, note: 'Last ayah of Al-Baqarah' },
  { surah: 2,   start: 153, end: 153, note: 'Patience and prayer' },
  { surah: 2,   start: 152, end: 152, note: 'Remember Me, I will remember you' },
  { surah: 3,   start: 8,   end: 8,   note: 'Do not let our hearts deviate' },
  { surah: 3,   start: 159, end: 159, note: 'Mercy and consultation' },
  { surah: 3,   start: 185, end: 185, note: 'Every soul will taste death' },
  { surah: 6,   start: 73,  end: 73,  note: 'His word is the truth' },
  { surah: 7,   start: 23,  end: 23,  note: "Adam's repentance" },
  { surah: 13,  start: 28,  end: 28,  note: 'Hearts find rest in remembrance' },
  { surah: 14,  start: 7,   end: 7,   note: 'If you are grateful, I will give you more' },
  { surah: 17,  start: 80,  end: 80,  note: 'Dua of entry and exit' },
  { surah: 20,  start: 25,  end: 25,  note: "Musa's dua: open my heart" },
  { surah: 25,  start: 74,  end: 74,  note: 'Dua for righteous family' },
  { surah: 28,  start: 24,  end: 24,  note: "Musa's dua for sustenance" },
  { surah: 39,  start: 53,  end: 53,  note: 'Allah forgives all sins' },
  { surah: 40,  start: 60,  end: 60,  note: 'Call upon Me, I will respond' },
  { surah: 41,  start: 30,  end: 30,  note: 'Those who say Allah is our Lord' },
  { surah: 49,  start: 13,  end: 13,  note: 'Most honourable is the most God-fearing' },
  { surah: 55,  start: 13,  end: 13,  note: 'Which favours of your Lord will you deny' },
  { surah: 65,  start: 2,   end: 3,   note: 'Whoever fears Allah, He will make a way' },
  { surah: 93,  start: 7,   end: 7,   note: 'He found you lost and guided you' },
  { surah: 94,  start: 5,   end: 6,   note: 'With hardship comes ease' },
  { surah: 103, start: 1,   end: 3,   note: 'Surah Al-Asr (whole)' },
  { surah: 109, start: 1,   end: 6,   note: 'Surah Al-Kafirun (whole)' },
  { surah: 112, start: 1,   end: 4,   note: 'Surah Al-Ikhlas (whole)' },
  { surah: 113, start: 1,   end: 5,   note: 'Surah Al-Falaq (whole)' },
  { surah: 114, start: 1,   end: 6,   note: 'Surah An-Nas (whole)' },
];

interface AyahRow {
  surah_number: number;
  ayah_number: number;
  arabic_text: string | null;
  text_indopak: string | null;
  urdu_translation: string | null;
  english_translation: string | null;
}

function joinNonEmpty(parts: (string | null | undefined)[], sep: string): string | null {
  const cleaned = parts.map((p) => p?.trim() ?? '').filter((p) => p.length > 0);
  return cleaned.length > 0 ? cleaned.join(sep) : null;
}

function isoDateAddDays(base: Date, offset: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  const iso = d.toISOString().split('T')[0];
  if (!iso) throw new Error('failed to format date');
  return iso;
}

async function fetchRange(range: AyahRange): Promise<AyahRow[]> {
  const { data, error } = await supabase
    .from('quran_ayahs')
    .select('surah_number, ayah_number, arabic_text, text_indopak, urdu_translation, english_translation')
    .eq('surah_number', range.surah)
    .gte('ayah_number', range.start)
    .lte('ayah_number', range.end)
    .order('ayah_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AyahRow[];
}

async function main() {
  const today = new Date();
  const startIso = isoDateAddDays(today, 0);
  const endIso = isoDateAddDays(today, PICKS.length - 1);

  let upserted = 0;
  let skipped = 0;
  let warned = 0;

  for (let i = 0; i < PICKS.length; i++) {
    const pick = PICKS[i]!;
    const rows = await fetchRange(pick);

    if (rows.length === 0) {
      console.warn(
        `[seed-knowledge] no rows for ${pick.surah}:${pick.start}-${pick.end} — skipping (${pick.note})`,
      );
      skipped++;
      continue;
    }

    const expectedCount = pick.end - pick.start + 1;
    if (rows.length < expectedCount) {
      console.warn(
        `[seed-knowledge] partial range ${pick.surah}:${pick.start}-${pick.end}: ` +
          `got ${rows.length}/${expectedCount} ayahs (${pick.note})`,
      );
      warned++;
    }

    // Prefer text_indopak (matches the Mushaf aesthetic); fall back to arabic_text.
    const arabic = joinNonEmpty(
      rows.map((r) => r.text_indopak ?? r.arabic_text),
      ' ',
    );
    const translation_ur = joinNonEmpty(rows.map((r) => r.urdu_translation), ' ');
    const translation_en = joinNonEmpty(rows.map((r) => r.english_translation), ' ');

    const ref = pick.start === pick.end
      ? `Quran ${pick.surah}:${pick.start}`
      : `Quran ${pick.surah}:${pick.start}-${pick.end}`;

    const display_date = isoDateAddDays(today, i);

    const { error } = await supabase
      .from('daily_knowledge')
      .upsert(
        {
          display_date,
          type: 'ayah',
          arabic_text: arabic,
          source_reference: ref,
          translation_ur,
          translation_en,
          context_ur: null,
          context_en: null,
          is_active: true,
        },
        { onConflict: 'display_date' },
      );

    if (error) {
      console.error(
        `[seed-knowledge] upsert failed for ${display_date} (${ref}): ${error.message}`,
      );
      skipped++;
      continue;
    }

    console.log(`[seed-knowledge] ${display_date} ← ${ref} (${pick.note})`);
    upserted++;
  }

  console.log(
    `\n[seed-knowledge] Seeded ${upserted} daily knowledge entries from ${startIso} to ${endIso}` +
      `${skipped ? `, skipped ${skipped}` : ''}` +
      `${warned ? `, ${warned} partial range(s)` : ''}.`,
  );
}

main().catch((err) => {
  console.error('[seed-knowledge] failed:', err);
  process.exit(1);
});
