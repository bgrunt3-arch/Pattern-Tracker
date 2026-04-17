#!/usr/bin/env tsx
/**
 * COCOcase Pattern Tracker — Imagen 4 Fast バッチ画像生成スクリプト
 *
 * 使用モデル: imagen-4.0-fast-generate-001（Google Gemini API）
 * APIキー取得: https://aistudio.google.com → 「Get API key」
 *
 * 使い方:
 *   npx tsx scripts/generate-images.ts [オプション]
 *
 * オプション:
 *   --theme  <theme>   テーマ絞り込み
 *                      (floral|marble|animal|food|botanical|geometric|abstract|vintage|celestial|coastal)
 *   --ids    <ids>     カンマ区切りのID絞り込み (例: 001,002,003)
 *   --limit  <n>       最大生成件数
 *   --skip-existing    public/generated/{id}.png が既に存在するIDをスキップ
 *   --dry-run          実際にはAPIを呼ばず、対象リストだけ表示
 *   --delay  <ms>      リクエスト間の待機時間（ミリ秒、デフォルト: 1000）
 *
 * 例:
 *   npx tsx scripts/generate-images.ts --dry-run
 *   npx tsx scripts/generate-images.ts --theme floral --limit 3
 *   npx tsx scripts/generate-images.ts --ids 001,002,003
 *   npx tsx scripts/generate-images.ts --theme marble --skip-existing
 *   npx tsx scripts/generate-images.ts --limit 10 --delay 2000
 *
 * 生成した画像は public/generated/{id}.png に保存されます。
 * git commit して vercel --prod でデプロイすれば本番環境でも表示されます。
 */

import * as fs from 'fs';
import * as path from 'path';

// ────────────────────────────────────────────────────────────────
// .env.local を読み込む
// ────────────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key?.trim() && !key.trim().startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

import { GoogleGenAI } from '@google/genai';
import { DESIGNS } from '../lib/designs';
import type { Theme } from '../lib/designs';

// ────────────────────────────────────────────────────────────────
// CLI 引数パース
// ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : undefined; };
const hasFlag = (flag: string) => args.includes(flag);

const themeFilter  = getArg('--theme') as Theme | undefined;
const idsFilter    = getArg('--ids')?.split(',').map(s => s.trim());
const limitStr     = getArg('--limit');
const limit        = limitStr ? parseInt(limitStr, 10) : Infinity;
const skipExisting = hasFlag('--skip-existing');
const dryRun       = hasFlag('--dry-run');
const delayMs      = parseInt(getArg('--delay') ?? '1000', 10);

// ────────────────────────────────────────────────────────────────
// 出力先
// ────────────────────────────────────────────────────────────────
const OUT_DIR       = path.join(process.cwd(), 'public', 'generated');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

type ManifestEntry = { url: string; generatedAt: string };
type Manifest = Record<string, ManifestEntry>;

function loadManifest(): Manifest {
  if (fs.existsSync(MANIFEST_PATH)) {
    try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')); } catch { /* */ }
  }
  return {};
}
function saveManifest(m: Manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2), 'utf-8');
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ────────────────────────────────────────────────────────────────
// メイン
// ────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !dryRun) {
    console.error('');
    console.error('❌  GEMINI_API_KEY が設定されていません。');
    console.error('');
    console.error('    取得方法: https://aistudio.google.com → 「Get API key」');
    console.error('    Googleアカウントがあれば無料で取得できます。');
    console.error('');
    console.error('    設定方法:');
    console.error('      .env.local に GEMINI_API_KEY=AIzaSy... を追記してください。');
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = loadManifest();

  // 対象デザイン絞り込み
  let targets = DESIGNS.filter(d => {
    if (themeFilter && d.theme !== themeFilter) return false;
    if (idsFilter && !idsFilter.includes(d.id)) return false;
    if (skipExisting && fs.existsSync(path.join(OUT_DIR, `${d.id}.png`))) return false;
    return true;
  });
  if (isFinite(limit)) targets = targets.slice(0, limit);

  const total = targets.length;

  console.log('');
  console.log(`🎨  COCOcase Imagen 4 Fast バッチ生成`);
  console.log(`    モデル: imagen-4.0-fast-generate-001`);
  console.log(`    対象:   ${total} 件`);
  if (themeFilter)  console.log(`    テーマ: ${themeFilter}`);
  if (idsFilter)    console.log(`    IDs:    ${idsFilter.join(', ')}`);
  if (skipExisting) console.log(`    既存スキップ: ON`);
  if (dryRun)       console.log(`    ⚠️  DRY RUN モード（APIは呼ばれません）`);
  console.log('');

  // Dry run モード: 一覧表示のみ
  if (dryRun) {
    targets.forEach((d, i) => {
      console.log(`  ${String(i + 1).padStart(3)}. [${d.id}] ${d.theme.padEnd(12)} ${d.name}`);
      console.log(`        ${d.prompt.slice(0, 80)}...`);
    });
    console.log('');
    console.log('✅  Dry run 完了。--dry-run フラグを外すと実際に生成されます。');
    return;
  }

  const ai = new GoogleGenAI({ apiKey: apiKey! });
  let success = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const d = targets[i];
    process.stdout.write(`  ⏳ [${i + 1}/${total}] ${d.id} ${d.name} ... `);

    const enhancedPrompt = `${d.prompt}, square seamless repeating pattern, suitable for phone case printing, high resolution, clean edges, 1:1 ratio`;

    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-fast-generate-001',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          outputMimeType: 'image/png',
        },
      });

      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) throw new Error('imageBytes が返されませんでした');

      // base64 → PNG ファイルとして保存
      const pngPath = path.join(OUT_DIR, `${d.id}.png`);
      fs.writeFileSync(pngPath, Buffer.from(imageBytes, 'base64'));

      manifest[d.id] = {
        url: `/generated/${d.id}.png`,
        generatedAt: new Date().toISOString(),
      };
      saveManifest(manifest);

      console.log(`✅  保存 → public/generated/${d.id}.png`);
      success++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌  失敗: ${msg}`);
      failed++;
    }

    if (i < targets.length - 1) await sleep(delayMs);
  }

  console.log('');
  console.log(`📊  完了 — 成功: ${success} 件 / 失敗: ${failed} 件`);
  console.log(`    マニフェスト: ${MANIFEST_PATH}`);

  if (success > 0) {
    console.log('');
    console.log('💡  画像をVercelデプロイに含めるには:');
    console.log('    git add public/generated/');
    console.log('    git commit -m "Add Imagen 4 generated images"');
    console.log('    npx vercel --prod');
  }
}

main().catch(err => {
  console.error('');
  console.error('💥 予期せぬエラー:', err);
  process.exit(1);
});
