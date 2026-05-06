#!/usr/bin/env npx tsx
/**
 * generate-mockups-photopea.ts
 *
 * 全デザインの pos01.png / pos02.png を Photopea API で生成する。
 * 既に public/mockups/{id}_{slug}/pos01.png が存在するデザインはスキップ。
 *
 * 実行:
 *   npx tsx scripts/generate-mockups-photopea.ts
 */

import fs from 'fs';
import path from 'path';
import { DESIGNS } from '../lib/designs';

// ── パス設定 ─────────────────────────────────────────────────────────────────

const PATTERNS_DIR = path.join(process.cwd(), 'public/patterns');
const MOCKUPS_DIR  = path.join(process.cwd(), 'public/mockups');
const PSD_DIR      = '/Users/tsuji/Downloads/Airpods Pro Case Mockup 12 in 1';

const POSITIONS = [
  {
    psd : 'airpods-pro-pos1[2d smart object].psd',
    out : 'pos01.png',
    // 内PSBのテクスチャ層名（この名前 or index で探す）
    innerLayerName: 'Dark-Marble',
  },
  {
    psd : 'airpods-pro-pos2[2d smart object].psd',
    out : 'pos02.png',
    innerLayerName: 'airpods-pro-texture place',
  },
];

// ── ヘルパー ─────────────────────────────────────────────────────────────────

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function patternFile(d: (typeof DESIGNS)[0]) {
  return path.join(PATTERNS_DIR, `${d.id}_${slug(d.name)}.png`);
}

function mockupDir(d: (typeof DESIGNS)[0]) {
  return path.join(MOCKUPS_DIR, `${d.id}_${slug(d.name)}`);
}

function hasExistingMockup(d: (typeof DESIGNS)[0]) {
  return fs.existsSync(path.join(mockupDir(d), 'pos01.png'));
}

// ── Photopea スクリプト ───────────────────────────────────────────────────────
// resource[0] = PSD（アクティブドキュメントとして自動で開く）
// resource[1] = パターン PNG（別ドキュメントとして開く）

function makePhotopeaScript(innerLayerName: string): string {
  return `
(async function() {
  var doc = app.activeDocument;

  // ── レイヤーを名前で再帰検索 ──────────────────────────────────────────
  function findLayer(container, name) {
    var ls = container.layers;
    for (var i = 0; i < ls.length; i++) {
      if (ls[i].name === name) return ls[i];
      if (ls[i].layers && ls[i].layers.length > 0) {
        var f = findLayer(ls[i], name);
        if (f) return f;
      }
    }
    return null;
  }

  // ── パターン PNG ドキュメントを特定 ────────────────────────────────────
  // resources[] は順番に開かれるので、PSD 以外の最後のドキュメントがパターン
  var patternDoc = null;
  for (var i = app.documents.length - 1; i >= 0; i--) {
    if (app.documents[i] !== doc) { patternDoc = app.documents[i]; break; }
  }
  if (!patternDoc) { app.echoToOE("ERROR: pattern doc not found"); return; }

  // ── 外スマートオブジェクト (Main > "Double Click...") を開く ───────────
  var outerSO = findLayer(doc, "Double Click to Add Your Texture Here");
  if (!outerSO) { app.echoToOE("ERROR: outer SO not found"); return; }
  doc.activeLayer = outerSO;
  executeAction(stringIDToTypeID("placedLayerEditContents"), undefined, DialogModes.NO);
  var psbDoc = app.activeDocument;

  // ── 内PSB内のテクスチャ層を開く ─────────────────────────────────────────
  var innerSO = findLayer(psbDoc, "${innerLayerName}");
  // 見つからなければ最後の SmartObjectLayer を使う（フォールバック）
  if (!innerSO) {
    var ls = psbDoc.layers;
    for (var i = ls.length - 1; i >= 0; i--) {
      if (ls[i].kind === "smartobject" || ls[i].typename === "ArtLayer") {
        innerSO = ls[i]; break;
      }
    }
  }
  if (!innerSO) { app.echoToOE("ERROR: inner SO not found"); return; }
  psbDoc.activeLayer = innerSO;
  executeAction(stringIDToTypeID("placedLayerEditContents"), undefined, DialogModes.NO);
  var texDoc = app.activeDocument;

  // ── パターンをコピーして内ドキュメントを上書き ──────────────────────────
  app.activeDocument = patternDoc;
  patternDoc.selection.selectAll();
  patternDoc.selection.copy();

  app.activeDocument = texDoc;
  // 既存コンテンツを全削除して、パターンに合わせてキャンバスリサイズ
  try { texDoc.selection.selectAll(); texDoc.selection.clear(); } catch(e) {}
  texDoc.resizeCanvas(patternDoc.width, patternDoc.height, AnchorPosition.MIDDLECENTER);
  executeAction(stringIDToTypeID("paste"), undefined, DialogModes.NO);
  texDoc.flattenImage();

  // ── 各レベルを保存して閉じる ─────────────────────────────────────────────
  texDoc.close(SaveOptions.SAVECHANGES);
  psbDoc.close(SaveOptions.SAVECHANGES);

  // ── PSD を PNG として書き出し ────────────────────────────────────────────
  doc.saveToOE("png").then(function(data) {
    app.echoToOE(data);
  });
})();
`;
}

// ── Photopea API 呼び出し ─────────────────────────────────────────────────────

async function callPhotopea(
  psdPath: string,
  patternPath: string,
  innerLayerName: string,
): Promise<Buffer> {
  const psdData     = fs.readFileSync(psdPath);
  const patternData = fs.readFileSync(patternPath);
  const script      = makePhotopeaScript(innerLayerName);

  const form = new FormData();
  form.append('resources[]', new Blob([psdData],     { type: 'application/octet-stream' }), 'template.psd');
  form.append('resources[]', new Blob([patternData], { type: 'image/png' }),                'pattern.png');
  form.append('script', script);

  const res = await fetch('https://www.photopea.com/api/', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());

  // PNG マジックバイトを探す（\x89PNG\r\n\x1a\n）
  const magic    = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngStart = buf.indexOf(magic);
  if (pngStart === -1) {
    // エラーメッセージを確認
    const preview = buf.toString('utf8', 0, Math.min(300, buf.length));
    throw new Error(`No PNG in response.\n${preview}`);
  }

  return buf.slice(pngStart);
}

// ── メイン ───────────────────────────────────────────────────────────────────

async function main() {
  const todo = DESIGNS.filter(d => !hasExistingMockup(d));
  const skip = DESIGNS.length - todo.length;

  console.log(`Total: ${DESIGNS.length}  Skip (existing): ${skip}  To generate: ${todo.length}`);
  console.log(`→ API calls: ${todo.length * POSITIONS.length}\n`);

  let done = 0, errors = 0;

  for (const design of todo) {
    const sl      = slug(design.name);
    const pattPath = patternFile(design);
    const outDir   = mockupDir(design);

    if (!fs.existsSync(pattPath)) {
      console.log(`⚠  [${design.id}] pattern missing, skip`);
      continue;
    }

    fs.mkdirSync(outDir, { recursive: true });

    for (const pos of POSITIONS) {
      const outPath = path.join(outDir, pos.out);
      if (fs.existsSync(outPath)) {
        console.log(`→  [${design.id}] ${pos.out} exists, skip`);
        continue;
      }

      const psdPath = path.join(PSD_DIR, pos.psd);
      process.stdout.write(`   [${design.id}] ${design.name}  ${pos.out} ... `);

      try {
        const png = await callPhotopea(psdPath, pattPath, pos.innerLayerName);
        fs.writeFileSync(outPath, png);
        console.log(`✓  ${(png.length / 1024).toFixed(0)} KB`);
        done++;
      } catch (e) {
        console.log(`✗  ${e}`);
        errors++;
        // エラーが続く場合は止める
        if (errors >= 5) {
          console.error('\n5 errors in a row — stopping. Check Photopea script.');
          process.exit(1);
        }
      }

      // Photopea API レート制限を考慮して少し待つ
      await new Promise(r => setTimeout(r, 1200));
    }

    // デザイン間の短い休憩
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n─── 完了 ───`);
  console.log(`✓  generated : ${done}`);
  console.log(`✗  errors    : ${errors}`);
}

main().catch(console.error);
