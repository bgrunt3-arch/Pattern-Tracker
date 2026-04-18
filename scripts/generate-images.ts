#!/usr/bin/env tsx
/**
 * COCOcase Pattern Tracker — Imagen 4 Fast バッチ画像生成スクリプト
 *
 * BLOB_READ_WRITE_TOKEN が .env.local にあれば Vercel Blob に保存。
 * なければ public/patterns/ にローカル保存（従来の動作）。
 *
 * 使い方:
 *   npm run gen:all
 *   npm run gen:floral
 *   npm run gen:range -- --from=001 --to=010
 */

import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { put } from "@vercel/blob";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import { DESIGNS } from "../lib/designs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const MODEL = process.env.IMAGE_MODEL || "imagen-4.0-fast-generate-001";
const RATE_LIMIT_MS = 2000;
const MAX_RETRIES = 2;
const OUTPUT_DIR = path.join(process.cwd(), "public", "patterns");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
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
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseModalities: ["IMAGE"] },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    return parts.find(p => p.inlineData)?.inlineData?.data ?? "";
  }
}

// ===== 単体生成 =====
async function generateOne(
  design: typeof DESIGNS[0],
  manifest: Manifest,
  attempt = 1
): Promise<"ok" | "skip" | "fail"> {
  const filename = `${design.id}_${slug(design.name)}.png`;

  // スキップ判定（Blob or ローカルに既存）
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

    if (USE_BLOB) {
      // Vercel Blob に保存
      const blob = await put(`patterns/${filename}`, buffer, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
      });
      url = blob.url;
      console.log(`✅ (Blob)`);
    } else {
      // ローカルに保存
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
      url = `/patterns/${filename}`;
      console.log(`✅ (local)`);
    }

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

  let list = [...DESIGNS];
  if (themeArg) list = list.filter(d => d.theme === themeArg);
  if (fromArg)  list = list.filter(d => parseInt(d.id) >= parseInt(fromArg));
  if (toArg)    list = list.filter(d => parseInt(d.id) <= parseInt(toArg));

  console.log(`\n🚀 ${list.length}枚を生成開始 (モデル: ${MODEL})`);
  console.log(`📦 保存先: ${USE_BLOB ? "Vercel Blob" : "public/patterns/ (ローカル)"}\n`);

  const startTime = Date.now();
  const manifest = loadManifest();
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
