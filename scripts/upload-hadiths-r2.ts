import * as fs from 'fs';
import * as path from 'path';
import { uploadFile, keyToPublicUrl } from './r2-client';

const FILES = [
  'bukhari.json',
  'muslim.json',
  'tirmidhi.json',
  'abudawud.json',
  'ibnmajah.json',
  'nasai.json',
];

async function main(): Promise<void> {
  const sourceDir = path.join(__dirname, '../assets/hadiths');
  if (!fs.existsSync(sourceDir)) {
    console.error(
      `Source folder not found: ${sourceDir}\nRun: npx tsx scripts/download-hadiths.ts`,
    );
    process.exit(1);
  }

  const urls: string[] = [];
  for (const filename of FILES) {
    const localPath = path.join(sourceDir, filename);
    if (!fs.existsSync(localPath)) {
      console.warn(`Skipping (missing): ${localPath}`);
      continue;
    }
    const key = `hadiths/${filename}`;
    const sizeMB = (fs.statSync(localPath).size / (1024 * 1024)).toFixed(2);
    process.stdout.write(`Uploading ${filename} (${sizeMB} MB) ... `);

    const url = await uploadFile(localPath, key, {
      contentType: 'application/json',
      cacheControl: 'public, max-age=2592000',
    });
    console.log('done');
    urls.push(url);
  }

  console.log('\nUploaded files:');
  for (const url of urls) console.log(`  ${url}`);
  console.log(`\nVerify by opening any URL above, or list:`);
  console.log(`  ${keyToPublicUrl('hadiths/bukhari.json')}`);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
