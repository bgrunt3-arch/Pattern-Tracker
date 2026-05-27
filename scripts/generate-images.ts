#!/usr/bin/env tsx
/**
 * COCOcase Pattern Tracker — Imagen 4 バッチ画像生成スクリプト
 *
 * BLOB_READ_WRITE_TOKEN が .env.local にあれば Vercel Blob に保存。
 * なければ public/patterns/ にローカル保存（従来の動作）。
 *
 * 使い方:
 *   npm run gen:all
 *   npm run gen:floral
 *   npm run gen:range -- --from=201 --to=450
 *
 * .env.local に必要な変数:
 *   GEMINI_API_KEY=...
 *   IMAGE_MODEL=imagen-4.0-fast-generate-001   # 省略時: imagen-4.0-fast-generate-001
 */

import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { put } from "@vercel/blob";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import { DESIGNS } from "../lib/designs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const MODEL = process.env.IMAGE_MODEL || "gemini-2.5-flash-image";
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || "2000");
const MAX_RETRIES = 2;
const OUTPUT_DIR = path.join(process.cwd(), "public", "patterns");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
// Blob は明示的に BLOB_ENABLED=1 が設定されたときだけ使う（Vercel Blob suspended 対策）。
// 設定されていてもネットワーク／ストア停止時はローカルにフォールバックする。
const USE_BLOB = process.env.BLOB_ENABLED === "1" && !!process.env.BLOB_READ_WRITE_TOKEN;
const TRIM_THRESHOLD = 15;
const TRIM_BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function trimWhiteBorder(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .trim({ background: TRIM_BG, threshold: TRIM_THRESHOLD })
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

const PROMPT_PREFIX =
  "Flat 2D seamless textile pattern swatch, top-down overhead view, ";
const PROMPT_SUFFIX =
  ", pattern fills entire frame edge to edge, repeating tileable design, no phone, no phone case, no device, no mockup, no 3D object, no product, no border, no frame, no shadow, no text, no watermark, flat textile design only";

function wrapPrompt(base: string): string {
  const clean = base
    .replace(/^Seamless pattern of /i, "")
    .replace(/,?\s*tileable,?\s*no text\.?$/i, "")
    .replace(/,?\s*tileable\.?$/i, "")
    .replace(/,?\s*no text\.?$/i, "");
  return `${PROMPT_PREFIX}${clean}${PROMPT_SUFFIX}`;
}

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY が .env.local に設定されていません");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (!USE_BLOB) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2), "utf-8");
}

// ===== ヘルパー =====
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ===== 画像生成 =====
async function generateImageBytes(prompt: string): Promise<string> {
  if (MODEL.startsWith("imagen")) {
    const response = await ai.models.generateImages({
      model: MODEL,
      prompt,
      config: { numberOfImages: 1, aspectRatio: "1:1" },
    });
    return response.generatedImages?.[0]?.image?.imageBytes ?? "";
  } else {
    // gemini-2.5-flash-image-preview など
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    return parts.find((p: { inlineData?: { data?: string } }) => p.inlineData)?.inlineData?.data ?? "";
  }
}

// ===== 単体生成 =====
async function generateOne(
  design: typeof DESIGNS[0],
  manifest: Manifest,
  attempt = 1
): Promise<"ok" | "skip" | "fail"> {
  const filename = `${design.id}_${slug(design.name)}.png`;

  if (manifest[design.id]) {
    console.log(`⏭️  ${design.id} ${design.name} (既存・スキップ)`);
    return "skip";
  }
  if (!USE_BLOB && fs.existsSync(path.join(OUTPUT_DIR, filename))) {
    console.log(`⏭️  ${design.id} ${design.name} (既存・スキップ)`);
    return "skip";
  }

  try {
    process.stdout.write(`🎨 ${design.id} ${design.name}... `);

    const imgBytes = await generateImageBytes(wrapPrompt(design.prompt));
    if (!imgBytes) throw new Error("画像データが返ってきませんでした");

    const rawBuffer = Buffer.from(imgBytes, "base64");
    const buffer = await trimWhiteBorder(rawBuffer);
    const generatedAt = new Date().toISOString();
    let url: string;

    let saved: "blob" | "local" | "local (fallback)" = USE_BLOB ? "blob" : "local";

    if (USE_BLOB) {
      try {
        const blob = await put(`patterns/${filename}`, buffer, {
          access: "public",
          contentType: "image/png",
          addRandomSuffix: false,
        });
        url = blob.url;
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        console.log(`⚠️  Blob put failed (${m.slice(0, 60)}), saving locally`);
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
        url = `/patterns/${filename}`;
        saved = "local (fallback)";
      }
    } else {
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
      url = `/patterns/${filename}`;
    }
    console.log(`✅ (${saved})`);

    manifest[design.id] = { url, generatedAt };
    saveManifest(manifest);

    return "ok";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`❌ ${msg}`);
    if (attempt < MAX_RETRIES) {
      const wait = 5000 * attempt;
      console.log(`   ↳ ${wait / 1000}秒後にリトライ (${attempt + 1}/${MAX_RETRIES})`);
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
  const fromArg  = args.find(a => a.startsWith("--from="))?.split("=")[1];
  const toArg    = args.find(a => a.startsWith("--to="))?.split("=")[1];
  const isTest   = args.includes("--test");

  let list = [...DESIGNS];
  if (themeArg) list = list.filter(d => d.theme === themeArg);
  if (fromArg)  list = list.filter(d => parseInt(d.id) >= parseInt(fromArg));
  if (toArg)    list = list.filter(d => parseInt(d.id) <= parseInt(toArg));

  const manifest = loadManifest();

  if (isTest) {
    list = list.filter(d => {
      if (manifest[d.id]) return false;
      const filename = `${d.id}_${slug(d.name)}.png`;
      if (!USE_BLOB && fs.existsSync(path.join(OUTPUT_DIR, filename))) return false;
      return true;
    }).slice(0, 1);
    if (list.length === 0) {
      console.log("\n[TEST MODE] 未生成のデザインがありません。テスト終了。");
      return;
    }
    console.log(`\n[TEST MODE] 未生成1枚を生成します: ${list[0].id} ${list[0].name}`);
  }

  console.log(`\n🚀 ${list.length}枚を生成開始 (モデル: ${MODEL})`);
  console.log(`📦 保存先: ${USE_BLOB ? "Vercel Blob" : "public/patterns/ (ローカル)"}`);
  console.log(`⏱  レート制限: ${RATE_LIMIT_MS / 1000}秒/枚\n`);

  const startTime = Date.now();
  const results = { ok: 0, skip: 0, fail: 0, failed: [] as string[] };

  for (let i = 0; i < list.length; i++) {
    const design = list[i];
    const result = await generateOne(design, manifest);
    results[result]++;
    if (result === "fail") results.failed.push(`${design.id} ${design.name}`);
    if (i < list.length - 1 && result !== "skip") await sleep(RATE_LIMIT_MS);
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
    console.log(`\n💡 もう一度実行すると失敗分だけ再試行します`);
  }
  if (USE_BLOB && results.ok > 0) {
    console.log(`\n📋 manifest.json を更新しました → git commit & push してください`);
  }
}

main().catch(e => {
  console.error("予期せぬエラー:", e);
  process.exit(1);
});
