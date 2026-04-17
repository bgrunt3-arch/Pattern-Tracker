#!/usr/bin/env tsx
/**
 * COCOcase Pattern Tracker — Imagen 4 Fast バッチ画像生成スクリプト
 *
 * 使用モデル: imagen-4.0-fast-generate-001（Google Gemini API）
 * APIキー取得: https://aistudio.google.com → 「Get API key」
 *
 * 使い方:
 *   npm run gen:all
 *   npm run gen:floral
 *   npm run gen:range -- --from=001 --to=010
 *
 * 生成した画像は public/patterns/{id}_{slug}.png に保存されます。
 */

import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { DESIGNS } from "../lib/designs";

// .env.local を読み込む
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// ===== 設定 =====
const MODEL = "imagen-4.0-fast-generate-001"; // 安くて速い ($0.02/枚)
const RATE_LIMIT_MS = 2000; // リクエスト間隔（無料枠なら30000=30秒が安全）
const MAX_RETRIES = 2;
const OUTPUT_DIR = path.join(process.cwd(), "public", "patterns");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");

// ===== プロンプトラッパー =====
// 各プロンプトに自動で追加される指示。
// 「スマホケース」や「3Dモックアップ」が生成されるのを防ぐ。
// パターン画像（テキスタイル素材）だけを生成させる。
const PROMPT_PREFIX =
  "Flat 2D seamless textile pattern swatch, top-down overhead view, ";
const PROMPT_SUFFIX =
  ", pattern fills entire frame edge to edge, repeating tileable design, no phone, no phone case, no device, no mockup, no 3D object, no product, no border, no frame, no shadow, no text, no watermark, flat textile design only";

function wrapPrompt(base: string): string {
  // 元のプロンプトから "Seamless pattern of " や "tileable, no text" を取り除いて、
  // 新しい前後指示で包み直す
  const clean = base
    .replace(/^Seamless pattern of /i, "")
    .replace(/,?\s*tileable,?\s*no text\.?$/i, "")
    .replace(/,?\s*tileable\.?$/i, "")
    .replace(/,?\s*no text\.?$/i, "");
  return `${PROMPT_PREFIX}${clean}${PROMPT_SUFFIX}`;
}

// ===== 初期化 =====
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY が .env.local に設定されていません");
  console.error("   取得方法: https://aistudio.google.com → 「Get API key」");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ===== マニフェスト =====
type ManifestEntry = { url: string; generatedAt: string };
type Manifest = Record<string, ManifestEntry>;

function loadManifest(): Manifest {
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
    } catch { /* ignore */ }
  }
  return {};
}

function saveManifest(m: Manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2), "utf-8");
}

// ===== ヘルパー =====
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ===== 単体生成 =====
async function generateOne(
  design: typeof DESIGNS[0],
  manifest: Manifest,
  attempt = 1
): Promise<"ok" | "skip" | "fail"> {
  const filename = `${design.id}_${slug(design.name)}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);

  if (fs.existsSync(filepath)) {
    console.log(`⏭️  ${design.id} ${design.name} (既存・スキップ)`);
    return "skip";
  }

  try {
    process.stdout.write(`🎨 ${design.id} ${design.name}... `);

    const wrappedPrompt = wrapPrompt(design.prompt);

    const response = await ai.models.generateImages({
      model: MODEL,
      prompt: wrappedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
      },
    });

    const imgBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imgBytes) throw new Error("画像データが返ってきませんでした");

    fs.writeFileSync(filepath, Buffer.from(imgBytes, "base64"));

    // マニフェスト更新
    manifest[design.id] = {
      url: `/patterns/${filename}`,
      generatedAt: new Date().toISOString(),
    };
    saveManifest(manifest);

    console.log(`✅`);
    return "ok";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`❌ ${msg}`);
    if (attempt < MAX_RETRIES) {
      const wait = 5000 * attempt;
      console.log(
        `   ↳ ${wait / 1000}秒待機後にリトライ (${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(wait);
      return generateOne(design, manifest, attempt + 1);
    }
    return "fail";
  }
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  const themeArg = args.find(a => a.startsWith("--theme="))?.split("=")[1];
  const fromArg = args.find(a => a.startsWith("--from="))?.split("=")[1];
  const toArg = args.find(a => a.startsWith("--to="))?.split("=")[1];

  let list = [...DESIGNS];
  if (themeArg) list = list.filter(d => d.theme === themeArg);
  if (fromArg) list = list.filter(d => parseInt(d.id) >= parseInt(fromArg));
  if (toArg) list = list.filter(d => parseInt(d.id) <= parseInt(toArg));

  console.log(`\n🚀 ${list.length}枚を生成開始 (モデル: ${MODEL})\n`);
  const startTime = Date.now();

  const manifest = loadManifest();
  const results = { ok: 0, skip: 0, fail: 0, failed: [] as string[] };

  for (let i = 0; i < list.length; i++) {
    const design = list[i];
    const result = await generateOne(design, manifest);
    results[result]++;
    if (result === "fail") results.failed.push(`${design.id} ${design.name}`);

    // 次のリクエストまで待機（最後は不要、スキップ時は不要）
    if (i < list.length - 1 && result !== "skip") {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n${"=".repeat(50)}`);
  console.log(`✨ 完了 (${elapsed}秒)`);
  console.log(`   ✅ 成功: ${results.ok}`);
  console.log(`   ⏭️  スキップ: ${results.skip}`);
  console.log(`   ❌ 失敗: ${results.fail}`);
  if (results.failed.length > 0) {
    console.log(`\n失敗した項目:`);
    results.failed.forEach(f => console.log(`   - ${f}`));
    console.log(
      `\n💡 もう一度 npm run gen:all を実行すると失敗分だけ再試行します`
    );
  }

  if (results.ok > 0) {
    console.log(`\n📁 保存先: ${OUTPUT_DIR}`);
    console.log(`📋 マニフェスト: ${MANIFEST_PATH}`);
  }
}

main().catch(e => {
  console.error("予期せぬエラー:", e);
  process.exit(1);
});
