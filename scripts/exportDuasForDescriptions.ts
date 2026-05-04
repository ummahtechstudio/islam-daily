/**
 * Phase D.1 — Generate the CSV template Luqman fills with Urdu descriptions.
 *
 * Reads every row from `duas` and writes
 * `content/dua-descriptions-TEMPLATE.csv` with columns:
 *   id, title_en, title_ur, text_arabic_preview, description_ur
 *
 * The `description_ur` column is left empty — that's what gets filled in from
 * the Hisn al-Muslim Urdu PDF. Rows are sorted by category, then id, so all
 * morning/sleep/etc. duas group naturally.
 *
 *     set SUPABASE_SERVICE_KEY=<service-role-key>
 *     npx tsx scripts/exportDuasForDescriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://vchfykblowmrcvyaljxn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error(
    '[export-duas] SUPABASE_SERVICE_KEY env var is required. ' +
      'Get it from Supabase dashboard → Project Settings → API → service_role key.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const OUT_DIR = path.join(__dirname, '..', 'content');
const OUT_FILE = path.join(OUT_DIR, 'dua-descriptions-TEMPLATE.csv');

interface DuaRow {
  id: number;
  category: string | null;
  title: string | null;
  arabic: string | null;
  urdu: string | null;
  description_ur: string | null;
}

/** Escape a single CSV cell per RFC 4180. */
function csvCell(raw: string | null | undefined): string {
  const s = raw ?? '';
  // Always quote — keeps Arabic / Urdu commas, line breaks, and quotes safe.
  return `"${s.replace(/"/g, '""')}"`;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const { data, error } = await supabase
    .from('duas')
    .select('id, category, title, arabic, urdu, description_ur')
    .order('category', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error(`[export-duas] failed: ${error.message}`);
    process.exit(1);
  }

  const rows = (data ?? []) as DuaRow[];

  const headers = ['id', 'category', 'title_en', 'title_ur', 'text_arabic_preview', 'description_ur'];
  const lines: string[] = [headers.join(',')];

  for (const r of rows) {
    const arabicPreview = (r.arabic ?? '').slice(0, 60).replace(/\s+/g, ' ').trim();
    lines.push(
      [
        csvCell(String(r.id)),
        csvCell(r.category),
        csvCell(r.title),
        csvCell(r.urdu),
        csvCell(arabicPreview),
        csvCell(r.description_ur),
      ].join(','),
    );
  }

  // BOM so Excel opens UTF-8 cleanly with Urdu/Arabic intact.
  fs.writeFileSync(OUT_FILE, '﻿' + lines.join('\r\n') + '\r\n', 'utf8');

  console.log(
    `[export-duas] Generated ${path.relative(process.cwd(), OUT_FILE)} with ${rows.length} rows.\n` +
      `Open it in Excel, fill in the description_ur column for each dua, ` +
      `save it as content/dua-descriptions.csv (without TEMPLATE), then run:\n` +
      `  npx tsx scripts/importDuaDescriptions.ts`,
  );
}

main().catch((err) => {
  console.error('[export-duas] failed:', err);
  process.exit(1);
});
