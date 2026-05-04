/**
 * Phase D.1 — Import Urdu descriptions from CSV into the duas table.
 *
 * Reads `content/dua-descriptions.csv` (the version Luqman filled in), and
 * UPDATEs each dua row by id, setting description_ur + description_source.
 * Rows with empty description_ur are skipped, so partial fills work fine.
 * Idempotent — re-running just overwrites with the latest CSV content.
 *
 *     set SUPABASE_SERVICE_KEY=<service-role-key>
 *     npx tsx scripts/importDuaDescriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://vchfykblowmrcvyaljxn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error(
    '[import-desc] SUPABASE_SERVICE_KEY env var is required. ' +
      'Get it from Supabase dashboard → Project Settings → API → service_role key.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const CSV_PATH = path.join(__dirname, '..', 'content', 'dua-descriptions.csv');

// ── Tiny RFC 4180 CSV parser (no extra deps) ────────────────────────────────
// Handles quoted fields, escaped quotes ("" → "), embedded commas/newlines.

function parseCsv(raw: string): string[][] {
  // Strip BOM if present.
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        // swallow — handled together with \n
        i++;
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  // Last field / row (file without trailing newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(
      `[import-desc] missing ${path.relative(process.cwd(), CSV_PATH)}. ` +
        `Run \`npx tsx scripts/exportDuasForDescriptions.ts\` first, then ` +
        `save your filled-in copy as that path.`,
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const table = parseCsv(raw);

  if (table.length < 2) {
    console.error('[import-desc] CSV is empty or only contains a header');
    process.exit(1);
  }

  const header = table[0]!.map((h) => h.trim());
  const idIdx = header.indexOf('id');
  const descIdx = header.indexOf('description_ur');

  if (idIdx === -1 || descIdx === -1) {
    console.error(
      `[import-desc] CSV must have "id" and "description_ur" columns. ` +
        `Got: ${header.join(', ')}`,
    );
    process.exit(1);
  }

  let imported = 0;
  let skipped = 0;
  let invalid = 0;

  for (let r = 1; r < table.length; r++) {
    const row = table[r]!;
    if (row.length === 1 && row[0] === '') continue; // blank trailing row

    const idRaw = (row[idIdx] ?? '').trim();
    const description = (row[descIdx] ?? '').trim();
    const id = Number(idRaw);

    if (!Number.isFinite(id)) {
      console.warn(`[import-desc] row ${r + 1}: bad id "${idRaw}"`);
      invalid++;
      continue;
    }

    if (description.length === 0) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('duas')
      .update({ description_ur: description, description_source: 'Hisn al-Muslim' })
      .eq('id', id);

    if (error) {
      console.error(`[import-desc] id=${id} update failed: ${error.message}`);
      invalid++;
      continue;
    }

    imported++;
  }

  console.log(
    `[import-desc] Imported ${imported} dua descriptions, skipped ${skipped} empty rows` +
      `${invalid ? `, ${invalid} errors` : ''}.`,
  );
}

main().catch((err) => {
  console.error('[import-desc] failed:', err);
  process.exit(1);
});
