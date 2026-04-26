import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command, _Object } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

dotenv.config();

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  R2_PUBLIC_URL,
} = process.env;

if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET ||
  !R2_ENDPOINT ||
  !R2_PUBLIC_URL
) {
  throw new Error(
    'Missing R2 env vars. Copy .env.example to .env and fill in credentials.',
  );
}

export const BUCKET = R2_BUCKET;
export const PUBLIC_URL = R2_PUBLIC_URL.replace(/\/$/, '');

export const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const EXT_CONTENT_TYPE: Record<string, string> = {
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream';
}

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
}

function publicUrl(key: string): string {
  return `${PUBLIC_URL}/${key.replace(/^\/+/, '')}`;
}

export async function uploadFile(
  localPath: string,
  r2Key: string,
  options: UploadOptions = {},
): Promise<string> {
  const body = fs.createReadStream(localPath);
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET,
      Key: r2Key,
      Body: body,
      ContentType: options.contentType ?? guessContentType(localPath),
      CacheControl: options.cacheControl ?? 'public, max-age=2592000',
    },
  });
  await upload.done();
  return publicUrl(r2Key);
}

export async function uploadFolder(
  folderPath: string,
  r2Prefix: string,
  options: UploadOptions = {},
): Promise<string[]> {
  const cleanPrefix = r2Prefix.replace(/\/+$/, '');
  const urls: string[] = [];

  async function walk(dir: string, relBase = ''): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile()) {
        const key = `${cleanPrefix}/${rel}`;
        process.stdout.write(`  ↑ ${key} ... `);
        const url = await uploadFile(full, key, options);
        console.log('done');
        urls.push(url);
      }
    }
  }

  await walk(folderPath);
  return urls;
}

export async function listObjects(prefix?: string): Promise<_Object[]> {
  const out: _Object[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    if (res.Contents) out.push(...res.Contents);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

export function keyToPublicUrl(key: string): string {
  return publicUrl(key);
}
