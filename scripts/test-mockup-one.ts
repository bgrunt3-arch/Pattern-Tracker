#!/usr/bin/env npx tsx
/**
 * test-mockup-one.ts
 * 003_vintage_rose を pos01 だけ Photopea API で生成してテスト
 * 成功したら public/mockups/003_vintage_rose/pos01.png に保存
 */

import fs from 'fs';
import path from 'path';

const PATTERNS_DIR = path.join(process.cwd(), 'public/patterns');
const MOCKUPS_DIR  = path.join(process.cwd(), 'public/mockups');
const PSD_DIR      = '/Users/tsuji/Downloads/Airpods Pro Case Mockup 12 in 1';

const TEST_DESIGN = { id: '003', name: 'Vintage Rose', slug: 'vintage_rose' };
const PSD_FILE    = 'airpods-pro-pos1[2d smart object].psd';
const INNER_LAYER = 'Dark-Marble';   // Layer 122.psb 内のテクスチャ層

// ── Photopea スクリプト ───────────────────────────────────────────────────────
const SCRIPT = `
(async function() {
  var doc = app.activeDocument;

  function findLayer(container, name) {
    var ls = container.layers;
    for (var i = 0; i < ls.length; i++) {
      if (ls[i].name === name) return ls[i];
      try {
        if (ls[i].layers && ls[i].layers.length > 0) {
          var f = findLayer(ls[i], name);
          if (f) return f;
        }
      } catch(e) {}
    }
    return null;
  }

  // パターンドキュメント（resource[1]）を特定
  var patternDoc = null;
  for (var i = app.documents.length - 1; i >= 0; i--) {
    if (app.documents[i] !== doc) { patternDoc = app.documents[i]; break; }
  }
  if (!patternDoc) { app.echoToOE("ERROR:no_pattern_doc"); return; }

  // ── 外スマートオブジェクトを開く ─────────────────────────────────────────
  var outerSO = findLayer(doc, "Double Click to Add Your Texture Here");
  if (!outerSO) { app.echoToOE("ERROR:outer_SO_not_found"); return; }
  doc.activeLayer = outerSO;
  executeAction(stringIDToTypeID("placedLayerEditContents"), undefined, DialogModes.NO);
  var psbDoc = app.activeDocument;

  // ── 内PSB内のテクスチャ層（Dark-Marble）を開く ──────────────────────────
  var innerSO = findLayer(psbDoc, "${INNER_LAYER}");
  if (!innerSO) {
    // フォールバック: 最後のレイヤーを使う
    innerSO = psbDoc.layers[psbDoc.layers.length - 1];
  }
  if (!innerSO) { app.echoToOE("ERROR:inner_SO_not_found"); return; }
  psbDoc.activeLayer = innerSO;
  executeAction(stringIDToTypeID("placedLayerEditContents"), undefined, DialogModes.NO);
  var texDoc = app.activeDocument;

  // ── パターンをコピーして差し替え ─────────────────────────────────────────
  app.activeDocument = patternDoc;
  patternDoc.selection.selectAll();
  patternDoc.selection.copy();

  app.activeDocument = texDoc;
  try { texDoc.selection.selectAll(); texDoc.selection.clear(); } catch(e) {}
  texDoc.resizeCanvas(patternDoc.width, patternDoc.height, AnchorPosition.MIDDLECENTER);
  executeAction(stringIDToTypeID("paste"), undefined, DialogModes.NO);
  texDoc.flattenImage();

  // ── 保存して閉じる ────────────────────────────────────────────────────────
  texDoc.close(SaveOptions.SAVECHANGES);
  psbDoc.close(SaveOptions.SAVECHANGES);

  // ── PNG エクスポート ──────────────────────────────────────────────────────
  doc.saveToOE("png").then(function(data) {
    app.echoToOE(data);
  });
})();
`;

async function main() {
  const psdPath     = path.join(PSD_DIR, PSD_FILE);
  const patternPath = path.join(PATTERNS_DIR, `${TEST_DESIGN.id}_${TEST_DESIGN.slug}.png`);
  const outDir      = path.join(MOCKUPS_DIR, `${TEST_DESIGN.id}_${TEST_DESIGN.slug}`);
  const outPath     = path.join(outDir, 'pos01.png');

  console.log('PSD    :', psdPath);
  console.log('Pattern:', patternPath);
  console.log('Output :', outPath);
  console.log('');

  if (!fs.existsSync(psdPath))     { console.error('PSD not found');     process.exit(1); }
  if (!fs.existsSync(patternPath)) { console.error('Pattern not found'); process.exit(1); }

  const psdData     = fs.readFileSync(psdPath);
  const patternData = fs.readFileSync(patternPath);

  console.log(`PSD size    : ${(psdData.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Pattern size: ${(patternData.length / 1024).toFixed(0)} KB`);
  console.log('');
  console.log('Calling Photopea API...');

  const form = new FormData();
  form.append('resources[]', new Blob([psdData],     { type: 'application/octet-stream' }), 'template.psd');
  form.append('resources[]', new Blob([patternData], { type: 'image/png' }),                'pattern.png');
  form.append('script', SCRIPT);

  const start = Date.now();
  const res = await fetch('https://www.photopea.com/api/', { method: 'POST', body: form });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`Response: ${res.status} in ${elapsed}s`);

  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`Response size: ${(buf.length / 1024).toFixed(0)} KB`);

  // レスポンスの先頭を表示（エラーチェック）
  const preview = buf.toString('utf8', 0, Math.min(200, buf.length));
  console.log('Response preview:', JSON.stringify(preview.replace(/\x00/g, '').slice(0, 100)));

  // PNG マジックバイトを探す
  const magic    = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngStart = buf.indexOf(magic);

  if (pngStart === -1) {
    console.error('\n✗ No PNG found in response');
    // レスポンス全体をテキストとして出力（デバッグ）
    console.log('Full response (text):', buf.toString('utf8', 0, Math.min(500, buf.length)));
    process.exit(1);
  }

  const png = buf.slice(pngStart);
  console.log(`\nPNG found at offset ${pngStart}, size: ${(png.length / 1024).toFixed(0)} KB`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, png);
  console.log(`\n✓ Saved: ${outPath}`);
  console.log('  → ブラウザで確認してください');
}

main().catch(console.error);
