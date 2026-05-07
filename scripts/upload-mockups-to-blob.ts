#!/usr/bin/env npx tsx
/**
 * upload-mockups-to-blob.ts
 *
 * public/mockups/ 配下の pos*.png を JPEG に変換して Vercel Blob にアップロード。
 * URL の manifest を public/mockup-urls.json に書き出す。
 *
 * 環境変数:
 *   BLOB_READ_WRITE_TOKEN  - Vercel Blob のトークン (.env.local)
 *   BLOB_ACCESS            - 'public' or 'private' (デフォルト 'public')
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';

const MOCKUPS_DIR = path.join(process.cwd(), 'public/mockups');
const MANIFEST    = path.join(process.cwd(), 'public/mockup-urls.json');
const BLOB_ACCESS = (process.env.BLOB_ACCESS ?? 'public') as 'public' | 'private';

// JPEG 変換設定
const JPEG_QUALITY = 85;

type Manifest = {
  access: 'public' | 'private';
  generatedAt: string;
  urls: Record<string, string>;
};

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) { console.error('BLOB_READ_WRITE_TOKEN なし'); process.exit(1); }

  console.log(`Blob access: ${BLOB_ACCESS}, JPEG quality: ${JPEG_QUALITY}`);

  // 既存 manifest 読み込み
  let manifest: Manifest = { access: BLOB_ACCESS, generatedAt: '', urls: {} };
  if (fs.existsSync(MANIFEST)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
      if (manifest.access !== BLOB_ACCESS) {
        console.log(`access 変更検出: ${manifest.access} → ${BLOB_ACCESS}, リセット`);
        manifest = { access: BLOB_ACCESS, generatedAt: '', urls: {} };
      }
    } catch {}
  }

  // ── 対象を集める ────────────────────────────────────────────────────────
  const dirs = fs.readdirSync(MOCKUPS_DIR).filter(d =>
    fs.statSync(path.join(MOCKUPS_DIR, d)).isDirectory()
  );

  const targets: { localPath: string; key: string }[] = [];
  for (const dir of dirs) {
    for (const file of ['pos01.png', 'pos02.png']) {
      const localPath = path.join(MOCKUPS_DIR, dir, file);
      if (!fs.existsSync(localPath)) continue;
      // .jpg として保存
      const jpgFile = file.replace('.png', '.jpg');
      targets.push({ localPath, key: `mockups/${dir}/${jpgFile}` });
    }
  }

  console.log(`対象: ${targets.length} 件 (manifest 既存: ${Object.keys(manifest.urls).length})\n`);

  let done = 0, skip = 0, err = 0;
  let totalBytes = 0;

  for (const { localPath, key } of targets) {
    if (manifest.urls[key]) { skip++; continue; }

    try {
      // PNG → JPEG 変換
      const jpgBuf = await sharp(localPath)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: JPEG_QUALITY })
        .toBuffer();

      const result = await put(key, jpgBuf, {
        access: BLOB_ACCESS,
        contentType: 'image/jpeg',
        addRandomSuffix: false,
        allowOverwrite: true,
        token,
      });

      manifest.urls[key] = result.url;
      done++;
      totalBytes += jpgBuf.length;

      if (done % 20 === 0) {
        const mb = (totalBytes / 1024 / 1024).toFixed(1);
        console.log(`  ${done}/${targets.length - skip} 完了 (累計 ${mb} MB)`);
        manifest.generatedAt = new Date().toISOString();
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
      }
    } catch (e) {
      console.error(`  ✗ ${key}: ${e}`);
      err++;
      if (err >= 3) {
        console.error('3件連続エラー — 停止');
        break;
      }
    }
  }

  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  const mb = (totalBytes / 1024 / 1024).toFixed(1);
  console.log(`\n─── 完了 ───`);
  console.log(`✓ アップロード: ${done}  (${mb} MB)`);
  console.log(`→ スキップ: ${skip}`);
  console.log(`✗ エラー: ${err}`);
}

main().catch(e => { console.error(e); process.exit(1); });
