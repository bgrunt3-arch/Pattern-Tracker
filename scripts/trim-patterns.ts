#!/usr/bin/env tsx
/**
 * COCOcase Pattern Tracker — 白枠トリムスクリプト
 *
 * public/patterns/*.png を走査して、純白に近い縁があれば自動で切り落とす。
 * 枠のない画像には影響なし（sharp の trim が何もしない）。
 *
 * 使い方:
 *   npm run trim
 *   npm run trim -- --dry-run  （実際には書き換えず、対象だけ表示）
 */

import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

const PATTERNS_DIR = path.join(process.cwd(), "public", "patterns");
const THRESHOLD = 15;
const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

const dryRun = process.argv.includes("--dry-run");

async function trimOne(file: string): Promise<"trimmed" | "unchanged" | "fail"> {
  const filePath = path.join(PATTERNS_DIR, file);
  try {
    const original = await sharp(filePath).metadata();
    const buffer = await sharp(filePath)
      .trim({ background: WHITE_BG, threshold: THRESHOLD })
      .png()
      .toBuffer();
    const trimmed = await sharp(buffer).metadata();

    const changed =
      trimmed.width !== original.width || trimmed.height !== original.height;

    if (!changed) return "unchanged";

    console.log(
      `✂️  ${file}: ${original.width}x${original.height} → ${trimmed.width}x${trimmed.height}`
    );

    if (!dryRun) fs.writeFileSync(filePath, buffer);
    return "trimmed";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`❌ ${file}: ${msg}`);
    return "fail";
  }
}

async function main() {
  const files = fs
    .readdirSync(PATTERNS_DIR)
    .filter(f => f.endsWith(".png"))
    .sort();

  console.log(`\n🔍 ${files.length}件をスキャン${dryRun ? " (DRY RUN)" : ""}\n`);

  const results = { trimmed: 0, unchanged: 0, fail: 0 };
  for (const file of files) {
    const r = await trimOne(file);
    results[r]++;
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✨ 完了`);
  console.log(`   ✂️  トリム: ${results.trimmed}`);
  console.log(`   ⏭️  変更なし: ${results.unchanged}`);
  console.log(`   ❌ 失敗: ${results.fail}`);
  if (dryRun) console.log(`\n💡 --dry-run なので書き換えていません`);
}

main().catch(e => {
  console.error("予期せぬエラー:", e);
  process.exit(1);
});
