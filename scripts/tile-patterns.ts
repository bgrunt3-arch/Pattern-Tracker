#!/usr/bin/env npx tsx
/**
 * tile-patterns.ts
 *
 * 512×512 のパターン PNG を、各 PSD テクスチャキャンバスサイズに
 * タイリングして拡大し、/tmp/patterns-pos01/ と /tmp/patterns-pos02/ に保存する。
 *
 * pos01 (Dark-Marble)            : 2500×2500
 * pos02 (airpods-pro-texture place): 1748×2480
 *
 * 実行: npx tsx scripts/tile-patterns.ts
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { DESIGNS } from '../lib/designs';

const PATTERNS_DIR = path.join(process.cwd(), 'public/patterns');

const TARGETS = [
  { name: 'pos01', w: 2500, h: 2500, outDir: '/tmp/patterns-pos01' },
  { name: 'pos02', w: 2500, h: 2500, outDir: '/tmp/patterns-pos02' },
];

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// 事前モック (001, 002 等) を分析した結果、タイリングではなく
// 単純に 512×512 → 2500×2500 にストレッチ（cover-fit）して使用している。
async function tilePattern(
  src: string,
  targetW: number,
  targetH: number,
  dst: string,
): Promise<void> {
  await sharp(src)
    .resize(targetW, targetH, { kernel: 'lanczos3', fit: 'cover' })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 90 })
    .toFile(dst);
}

async function main() {
  for (const target of TARGETS) {
    fs.mkdirSync(target.outDir, { recursive: true });
    console.log(`\n=== ${target.name} (${target.w}×${target.h}) → ${target.outDir} ===`);

    let done = 0, skip = 0, err = 0;

    for (const design of DESIGNS) {
      const sl  = slug(design.name);
      const src = path.join(PATTERNS_DIR, `${design.id}_${sl}.png`);
      const dst = path.join(target.outDir, `${design.id}_${sl}.jpg`);

      if (!fs.existsSync(src)) { skip++; continue; }
      if (fs.existsSync(dst))  { skip++; continue; }

      try {
        await tilePattern(src, target.w, target.h, dst);
        process.stdout.write('.');
        done++;
      } catch (e) {
        process.stdout.write('x');
        err++;
        console.error(`\nERROR ${design.id}:`, e);
      }
    }

    console.log(`\n✓ ${done}  skip ${skip}  err ${err}`);
  }

  console.log('\n完了');
}

main().catch(console.error);
