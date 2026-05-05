#!/usr/bin/env tsx
/**
 * COCOcase Pattern — OpenAI 画像生成スクリプト
 *
 * 使い方:
 *   npx tsx scripts/generate-images-openai.ts --from=451 --to=455
 *   npx tsx scripts/generate-images-openai.ts --ids=451,452,453
 *
 * .env.local に必要:
 *   OPENAI_API_KEY=sk-...
 *
 * オプション環境変数:
 *   OPENAI_IMAGE_MODEL=gpt-image-1   # デフォルト: gpt-image-1
 *   RATE_LIMIT_MS=3000               # デフォルト: 3000ms
 */

import dotenv from "dotenv";
import OpenAI from "openai";
import { put } from "@vercel/blob";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import { DESIGNS } from "../lib/designs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY が .env.local に設定されていません");
  process.exit(1);
}

const MODEL       = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const RATE_MS     = parseInt(process.env.RATE_LIMIT_MS || "3000");
const MAX_RETRIES = 2;
const OUTPUT_DIR  = path.join(process.cwd(), "public", "patterns");
const USE_BLOB    = !!process.env.BLOB_READ_WRITE_TOKEN;
const TRIM_BG     = { r: 255, g: 255, b: 255, alpha: 1 } as const;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (!USE_BLOB) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── プロンプト整形 ────────────────────────────────────────────────

const PREFIX = "Flat 2D seamless textile pattern swatch, top-down overhead view, ";
const SUFFIX  = ", pattern fills entire frame edge to edge, repeating tileable design, no phone, no phone case, no device, no mockup, no 3D object, no product, no border, no frame, no shadow, no text, no watermark, flat textile design only";

function wrapPrompt(base: string): string {
  const clean = base
    .replace(/^Seamless pattern of /i, "")
    .replace(/,?\s*tileable,?\s*no text\.?$/i, "")
    .replace(/,?\s*tileable\.?$/i, "")
    .replace(/,?\s*no text\.?$/i, "");
  return `${PREFIX}${clean}${SUFFIX}`;
}

// ── ヘルパー ─────────────────────────────────────────────────────

const slug  = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function trimWhite(buf: Buffer): Promise<Buffer> {
  try {
    return await sharp(buf).trim({ background: TRIM_BG, threshold: 15 }).png().toBuffer();
  } catch {
    return buf;
  }
}

// ── 画像生成 ─────────────────────────────────────────────────────

async function generateBytes(prompt: string): Promise<Buffer> {
  // GPT imageモデルは response_format 非対応・b64_json を常に返す
  const res = await openai.images.generate({
    model: MODEL,
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "low",
  } as Parameters<typeof openai.images.generate>[0]);

  const b64 = res.data[0]?.b64_json;
  if (!b64) throw new Error("画像データが返ってきませんでした");
  return Buffer.from(b64, "base64");
}

// ── 単体処理 ─────────────────────────────────────────────────────

async function processOne(
  design: (typeof DESIGNS)[0],
  attempt = 1
): Promise<"ok" | "skip" | "fail"> {
  const filename = `${design.id}_${slug(design.name)}.png`;
  const localPath = path.join(OUTPUT_DIR, filename);

  if (!USE_BLOB && fs.existsSync(localPath)) {
    console.log(`⏭️  ${design.id} ${design.name} (既存・スキップ)`);
    return "skip";
  }

  try {
    process.stdout.write(`🎨 ${design.id} ${design.name}... `);
    const raw = await generateBytes(wrapPrompt(design.prompt));
    const buf = await trimWhite(raw);

    if (USE_BLOB) {
      await put(`patterns/${filename}`, buf, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
      });
      console.log("✅ (Blob)");
    } else {
      fs.writeFileSync(localPath, buf);
      console.log("✅ (local)");
    }
    return "ok";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`❌ ${msg}`);
    if (attempt < MAX_RETRIES) {
      const wait = 5000 * attempt;
      console.log(`   ↳ ${wait / 1000}秒後にリトライ (${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
      return processOne(design, attempt + 1);
    }
    return "fail";
  }
}

// ── メイン ───────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const fromArg = args.find(a => a.startsWith("--from="))?.split("=")[1];
  const toArg   = args.find(a => a.startsWith("--to="))?.split("=")[1];
  const idsArg  = args.find(a => a.startsWith("--ids="))?.split("=")[1];

  let list = [...DESIGNS];
  if (idsArg) {
    const ids = new Set(idsArg.split(",").map(s => s.trim()));
    list = list.filter(d => ids.has(d.id));
  } else {
    if (fromArg) list = list.filter(d => parseInt(d.id) >= parseInt(fromArg));
    if (toArg)   list = list.filter(d => parseInt(d.id) <= parseInt(toArg));
  }

  if (list.length === 0) {
    console.error("❌ 対象デザインが見つかりません");
    process.exit(1);
  }

  console.log(`\n🚀 ${list.length}枚を生成 (モデル: ${MODEL})`);
  console.log(`📦 保存先: ${USE_BLOB ? "Vercel Blob" : "public/patterns/ (ローカル)"}`);
  console.log(`⏱  レート制限: ${RATE_MS / 1000}秒/枚\n`);

  const results = { ok: 0, skip: 0, fail: 0, failed: [] as string[] };

  for (let i = 0; i < list.length; i++) {
    const r = await processOne(list[i]);
    results[r]++;
    if (r === "fail") results.failed.push(`${list[i].id} ${list[i].name}`);
    if (i < list.length - 1 && r !== "skip") await sleep(RATE_MS);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✨ 完了`);
  console.log(`   ✅ 成功: ${results.ok}`);
  console.log(`   ⏭️  スキップ: ${results.skip}`);
  console.log(`   ❌ 失敗: ${results.fail}`);
  if (results.failed.length > 0) {
    console.log(`\n失敗した項目:`);
    results.failed.forEach(f => console.log(`   - ${f}`));
  }
}

main().catch(e => {
  console.error("予期せぬエラー:", e);
  process.exit(1);
});
