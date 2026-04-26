import * as fs from 'fs';
import * as path from 'path';

const BOOKS = [
  { key: 'bukhari',  label: 'Bukhari' },
  { key: 'muslim',   label: 'Muslim' },
  { key: 'tirmidhi', label: 'Tirmidhi' },
  { key: 'abudawud', label: 'Abu Dawud' },
  { key: 'ibnmajah', label: 'Ibn Majah' },
  { key: 'nasai',    label: "Nasa'i" },
];

function buildUrls(book: string): string[] {
  return [
    `https://raw.githubusercontent.com/A7med3bdulBaset/hadith-json/v1.2.0/db/by_book/the_9_books/${book}.json`,
    `https://raw.githubusercontent.com/A7med3bdulBaset/hadith-json/main/db/by_book/the_9_books/${book}.json`,
    `https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books/${book}.json`,
  ];
}

async function downloadBook(book: string, label: string, outputDir: string): Promise<boolean> {
  const urls = buildUrls(book);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const attemptLabel = i === 0 ? 'primary' : `fallback ${i}`;
    console.log(`[${label}] Trying ${attemptLabel}: ${url}`);

    try {
      const res = await fetch(url);

      if (!res.ok) {
        console.log(`[${label}] HTTP ${res.status} ${res.statusText}`);
        if (res.status === 404 && i < urls.length - 1) {
          console.log(`[${label}] Got 404, trying next fallback URL...`);
          continue;
        }
        if (i < urls.length - 1) {
          continue;
        }
        console.error(`[${label}] ERROR: All URLs failed for ${book} (last status: ${res.status})`);
        return false;
      }

      const text = await res.text();
      const sizeMB = (Buffer.byteLength(text, 'utf-8') / (1024 * 1024)).toFixed(2);

      let json: any;
      try {
        json = JSON.parse(text);
      } catch (parseErr: any) {
        console.error(`[${label}] ERROR: failed to parse JSON: ${parseErr.message}`);
        if (i < urls.length - 1) continue;
        return false;
      }

      const count = Array.isArray(json) ? json.length : json.hadiths?.length ?? '?';
      fs.writeFileSync(path.join(outputDir, `${book}.json`), text, 'utf-8');
      console.log(`[${label}] OK — ${count} hadiths, ${sizeMB} MB saved to ${book}.json`);
      return true;
    } catch (err: any) {
      console.log(`[${label}] Network error: ${err.message}`);
      if (i < urls.length - 1) {
        console.log(`[${label}] Trying next fallback URL...`);
        continue;
      }
      console.error(`[${label}] ERROR: All URLs failed for ${book}`);
      return false;
    }
  }

  return false;
}

async function main() {
  const outputDir = path.join(__dirname, '../assets/hadiths');
  fs.mkdirSync(outputDir, { recursive: true });

  const failed: string[] = [];

  for (const { key, label } of BOOKS) {
    const ok = await downloadBook(key, label, outputDir);
    if (!ok) failed.push(label);
    console.log('');
  }

  if (failed.length > 0) {
    console.error(`Failed to download: ${failed.join(', ')}`);
    process.exit(1);
  }

  console.log('All files saved to assets/hadiths/');
  console.log('Next: npx tsx scripts/seed-hadiths.ts');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
