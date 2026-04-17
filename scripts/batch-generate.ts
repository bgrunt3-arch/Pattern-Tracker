#!/usr/bin/env tsx
/**
 * COCOcase Pattern Tracker — バッチ画像生成スクリプト
 *
 * 使い方:
 *   npx tsx scripts/batch-generate.ts [オプション]
 *
 * オプション:
 *   --theme  <theme>    テーマ絞り込み (floral|marble|animal|food|botanical|geometric|abstract|vintage|celestial|coastal)
 *   --ids    <ids>      カンマ区切りのID絞り込み (例: 001,002,003)
 *   --limit  <n>        最大生成件数
 *   --skip-existing     public/generated/{id}.png が既に存在するIDをスキップ
 *   --dry-run           実際にはAPIを呼ばず、対象リストだけ表示
 *   --delay  <ms>       リクエスト間の待機時間（ミリ秒、デフォルト: 2000）
 *
 * 例:
 *   npx tsx scripts/batch-generate.ts --theme floral --limit 3 --dry-run
 *   npx tsx scripts/batch-generate.ts --ids 001,002,003
 *   npx tsx scripts/batch-generate.ts --theme marble --skip-existing
 *   npx tsx scripts/batch-generate.ts --limit 10 --delay 3000
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// .env.local を読み込む
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key?.trim() && !key.trim().startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

import OpenAI from 'openai';
import { DESIGNS } from '../lib/designs';
import type { Theme } from '../lib/designs';

// ────────────────────────────────────────────────────────────────
// CLI 引数パース
// ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};
const hasFlag = (flag: string) => args.includes(flag);

const themeFilter    = getArg('--theme') as Theme | undefined;
const idsFilter      = getArg('--ids')?.split(',').map(s => s.trim());
const limitStr       = getArg('--limit');
const limit          = limitStr ? parseInt(limitStr, 10) : Infinity;
const skipExisting   = hasFlag('--skip-existing');
const dryRun         = hasFlag('--dry-run');
const delayMs        = parseInt(getArg('--delay') ?? '2000', 10);

// ────────────────────────────────────────────────────────────────
// 出力先
// ────────────────────────────────────────────────────────────────
const OUT_DIR      = path.join(process.cwd(), 'public', 'generated');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

type Manifest = Record<string, { url: string; generatedAt: string; revisedPrompt?: string }>;

function loadManifest(): Manifest {
  if (fs.existsSync(MANIFEST_PATH)) {
    try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')); } catch { /* */ }
  }
  return {};
}
function saveManifest(manifest: Manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

// ────────────────────────────────────────────────────────────────
// 画像ダウンロード
// ────────────────────────────────────────────────────────────────
function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, response => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadImage(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', err => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ────────────────────────────────────────────────────────────────
// メイン
// ────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !dryRun) {
    console.error('❌  OPENAI_API_KEY が設定されていません。');
    console.error('    .env.local に OPENAI_API_KEY=sk-... を記載してください。');
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const manifest = loadManifest();

  // 対象デザイン絞り込み
  let targets = DESIGNS.filter(d => {
    if (themeFilter && d.theme !== themeFilter) return false;
    if (idsFilter && !idsFilter.includes(d.id)) return false;
    if (skipExisting) {
      const pngPath = path.join(OUT_DIR, `${d.id}.png`);
      if (fs.existsSync(pngPath)) return false;
    }
    return true;
  });

  if (isFinite(limit)) targets = targets.slice(0, limit);

  const total = targets.length;
  console.log(`\n🎨  COCOcase バッチ生成 — 対象: ${total} 件`);
  if (themeFilter)  console.log(`   テーマ: ${themeFilter}`);
  if (idsFilter)    console.log(`   IDs: ${idsFilter.join(', ')}`);
  if (skipExisting) console.log(`   既存スキップ: ON`);
  if (dryRun)       console.log(`   ⚠️  DRY RUN モード（APIは呼ばれません）`);
  console.log('');

  if (dryRun) {
    targets.forEach((d, i) => {
      console.log(`  ${String(i + 1).padStart(3, ' ')}. [${d.id}] ${d.theme.padEnd(12)} ${d.name}`);
      console.log(`       ${d.prompt.slice(0, 80)}...`);
    });
    console.log('\n✅  Dry run 完了。--dry-run フラグを外すと実行されます。');
    return;
  }

  const openai = new OpenAI({ apiKey });
  let success = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const d = targets[i];
    const label = `[${i + 1}/${total}] ${d.id} ${d.name}`;
    process.stdout.write(`  ⏳ ${label} ... `);

    const enhancedPrompt = `${d.prompt}, square seamless repeating pattern, suitable for phone case printing, high resolution, clean edges, 1:1 ratio`;

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      });

      const imageUrl = response.data?.[0]?.url ?? null;
      const revisedPrompt = response.data?.[0]?.revised_prompt ?? null;

      if (!imageUrl) throw new Error('URLが返されませんでした');

      const pngPath = path.join(OUT_DIR, `${d.id}.png`);
      await downloadImage(imageUrl, pngPath);

      manifest[d.id] = {
        url: `/generated/${d.id}.png`,
        generatedAt: new Date().toISOString(),
        ...(revisedPrompt ? { revisedPrompt } : {}),
      };
      saveManifest(manifest);

      console.log(`✅  保存: public/generated/${d.id}.png`);
      success++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌  失敗: ${msg}`);
      failed++;
    }

    if (i < targets.length - 1) await sleep(delayMs);
  }

  console.log(`\n📊  完了 — 成功: ${success}件 / 失敗: ${failed}件`);
  console.log(`   マニフェスト: ${MANIFEST_PATH}`);
  if (success > 0) {
    console.log('\n💡  画像をデプロイに含めるには:');
    console.log('   git add public/generated/ && git commit -m "Add generated images"');
    console.log('   npx vercel --prod');
  }
}

main().catch(err => {
  console.error('\n💥 予期せぬエラー:', err);
  process.exit(1);
});
