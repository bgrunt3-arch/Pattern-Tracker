#!/usr/bin/env npx tsx
/**
 * generate-icons.ts
 *
 * COCOcase のアプリアイコンを生成。
 * 出力先: public/icons/ + public/apple-touch-icon.png + public/favicon.ico
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public/icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

// SVG デザイン: クリーム背景に Fraunces 風セリフの "co"
function makeSVG(size: number, rounded: boolean): string {
  const radius = rounded ? size * 0.22 : 0;
  const fontSize = size * 0.58;
  // テキストの y 位置を視覚バランスで微調整
  const textY = size * 0.66;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#F5EFE6" rx="${radius}" ry="${radius}"/>
  <text x="${size / 2}" y="${textY}"
        text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-style="italic"
        font-size="${fontSize}"
        font-weight="500"
        fill="#2B2620">co</text>
  <circle cx="${size * 0.78}" cy="${size * 0.7}" r="${size * 0.045}" fill="#B85C5C"/>
</svg>`;
}

async function gen(size: number, name: string, rounded = false) {
  const svg = Buffer.from(makeSVG(size, rounded));
  const outPath = path.join(OUT_DIR, name);
  await sharp(svg).png().toFile(outPath);
  console.log(`✓ ${name} (${size}×${size})`);
  return outPath;
}

async function main() {
  // PWA / Android
  await gen(192, 'icon-192.png');
  await gen(512, 'icon-512.png');
  // Apple touch icon (角丸無し、iOS が自動でマスクする)
  await gen(180, 'apple-touch-icon.png');
  fs.copyFileSync(
    path.join(OUT_DIR, 'apple-touch-icon.png'),
    path.join(process.cwd(), 'public/apple-touch-icon.png'),
  );
  // 角丸版（Android adaptive 用にも使える）
  await gen(512, 'icon-rounded-512.png', true);

  // Master
  await gen(1024, 'icon-master.png');

  // favicon (PNG をそのまま .ico の代わりに)
  const f32 = path.join(OUT_DIR, 'favicon-32.png');
  await sharp(Buffer.from(makeSVG(32, false))).png().toFile(f32);
  fs.copyFileSync(f32, path.join(process.cwd(), 'public/favicon.png'));
  console.log('✓ favicon.png (32×32)');

  console.log('\n完了');
}

main().catch(e => { console.error(e); process.exit(1); });
