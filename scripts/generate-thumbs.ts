#!/usr/bin/env npx tsx
/**
 * generate-thumbs.ts
 * Blob ストア停止中の代替: モックアップ PNG を小さな JPEG に変換して
 * public/mockup-thumbs/ に保存する。
 *
 * 実行: npx tsx scripts/generate-thumbs.ts
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SRC_DIR   = '/Volumes/PSScratch/cococase-mockups';
const DEST_DIR  = path.join(process.cwd(), 'public/mockup-thumbs');
const WIDTH     = 480;   // サムネイル幅px
const QUALITY   = 82;

let done = 0, skipped = 0, errors = 0;

async function main() {
  fs.mkdirSync(DEST_DIR, { recursive: true });

  const designs = fs.readdirSync(SRC_DIR).filter(d =>
    fs.statSync(path.join(SRC_DIR, d)).isDirectory()
  );

  console.log(`変換対象: ${designs.length} デザイン\n`);

  for (const design of designs) {
    const srcDesignDir  = path.join(SRC_DIR, design);
    const destDesignDir = path.join(DEST_DIR, design);
    fs.mkdirSync(destDesignDir, { recursive: true });

    const pngs = fs.readdirSync(srcDesignDir).filter(f => f.endsWith('.png'));

    for (const png of pngs) {
      const destFile = path.join(destDesignDir, png.replace('.png', '.jpg'));
      if (fs.existsSync(destFile)) { skipped++; continue; }

      try {
        await sharp(path.join(srcDesignDir, png))
          .resize(WIDTH)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: QUALITY })
          .toFile(destFile);
        done++;
        if (done % 50 === 0) console.log(`  ${done} 件完了...`);
      } catch (e) {
        console.error(`ERROR: ${design}/${png} — ${e}`);
        errors++;
      }
    }
  }

  console.log(`\n完了: ${done} 生成 / ${skipped} スキップ / ${errors} エラー`);
}

main().catch(e => { console.error(e); process.exit(1); });
