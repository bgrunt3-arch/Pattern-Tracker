#!/usr/bin/env npx tsx
/**
 * clear-blob-mockups.ts
 *
 * Vercel Blob から "mockups/" プレフィックスのファイルを全削除する。
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { list, del } from '@vercel/blob';

const BLOB_ACCESS = (process.env.BLOB_ACCESS ?? 'public') as 'public' | 'private';

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) { console.error('BLOB_READ_WRITE_TOKEN なし'); process.exit(1); }

  let cursor: string | undefined;
  let total = 0;

  do {
    const r = await list({ prefix: 'mockups/', cursor, limit: 1000, token });
    if (r.blobs.length === 0) break;

    const urls = r.blobs.map(b => b.url);
    await del(urls, { token });
    total += urls.length;
    console.log(`  ${total} 削除済み`);
    cursor = r.cursor;
  } while (cursor);

  console.log(`\n✓ ${total} ファイル削除完了`);
}

main().catch(e => { console.error(e); process.exit(1); });
