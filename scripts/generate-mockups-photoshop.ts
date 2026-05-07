#!/usr/bin/env npx tsx
/**
 * generate-mockups-photoshop.ts
 *
 * Photoshop 2026 を osascript 経由で操作して全デザインの
 * pos01.png をバッチ生成する。
 *
 * Scratch disk 対策: CHUNK_SIZE デザインごとに Photoshop を再起動。
 *
 * 実行:
 *   npx tsx scripts/generate-mockups-photoshop.ts
 *
 * 1枚だけテスト:
 *   npx tsx scripts/generate-mockups-photoshop.ts --test
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { DESIGNS } from '../lib/designs';

const MOCKUPS_DIR = path.join(process.cwd(), 'public/mockups');
const JSX_SCRIPT  = path.join(process.cwd(), 'scripts/apply-textures.jsx');
const JSON_INPUT  = '/tmp/cococase-designs.json';
const LOG_FILE    = '/tmp/cococase-progress.log';

const CHUNK_SIZE = 1;
const isTest     = process.argv.includes('--test');

// ── ヘルパー ─────────────────────────────────────────────────────────────────

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function hasMockup(d: (typeof DESIGNS)[0]) {
  return fs.existsSync(path.join(MOCKUPS_DIR, `${d.id}_${slug(d.name)}`, 'pos01.png'));
}

function killPhotoshop() {
  try { spawnSync('pkill', ['-x', 'Adobe Photoshop 2026'], { stdio: 'ignore' }); } catch {}
  // 完全終了を待つ
  let waited = 0;
  while (waited < 30) {
    const ps = spawnSync('pgrep', ['-x', 'Adobe Photoshop 2026']);
    if (ps.status !== 0) return;
    spawnSync('sleep', ['1']);
    waited++;
  }
}

function diskFreeGB(): number {
  const r = spawnSync('df', ['-k', '/']);
  const out = r.stdout.toString();
  const match = out.split('\n')[1]?.match(/\S+\s+\S+\s+\S+\s+(\d+)/);
  return match ? Number(match[1]) / 1024 / 1024 : 0;
}

function runChunk(chunk: { id: string; name: string }[]): { ok: number; err: number } {
  // JSON 入力ファイル生成
  fs.writeFileSync(JSON_INPUT, JSON.stringify(chunk));

  // ログリセット
  fs.writeFileSync(LOG_FILE, '');

  // 1. Photoshop を起動
  spawnSync('osascript', ['-e', 'tell application "Adobe Photoshop 2026" to activate'], { encoding: 'utf-8' });

  // 2. 起動完了を少し待ってから、起動時の警告ダイアログを Return で閉じる
  spawnSync('sleep', ['4']);
  // 容量警告ダイアログがあれば Return で閉じる（最大3回）
  for (let i = 0; i < 3; i++) {
    spawnSync('osascript', ['-e', 'tell application "System Events" to keystroke return'], { encoding: 'utf-8' });
    spawnSync('sleep', ['0.5']);
  }

  // 3. JSX 実行
  const osa = `tell application "Adobe Photoshop 2026"
    activate
    do javascript file "${JSX_SCRIPT}"
  end tell`;

  const r = spawnSync('osascript', ['-e', osa], { encoding: 'utf-8' });
  if (r.status !== 0) {
    console.error(`[osascript exit ${r.status}]`, r.stderr?.slice(0, 300));
  }

  // 結果カウント（JSX writeln は \r 区切り）
  const log    = fs.readFileSync(LOG_FILE, 'utf-8');
  const lines  = log.split(/[\r\n]+/);
  const okCnt  = lines.filter(l => l.startsWith('OK:')).length;
  const errCnt = lines.filter(l => l.startsWith('ERROR:')).length;

  for (const line of lines) {
    if (line.startsWith('OK:'))         console.log(`✓ ${line.slice(4)}`);
    else if (line.startsWith('ERROR:')) console.error(`✗ ${line.slice(7)}`);
    else if (line.startsWith('WARN:'))  console.warn(`⚠ ${line.slice(6)}`);
    else if (line.startsWith('SKIP:'))  console.log(`→ ${line.slice(6)}`);
  }

  return { ok: okCnt, err: errCnt };
}

// ── メイン ───────────────────────────────────────────────────────────────────

async function main() {
  let todo = DESIGNS.filter(d => !hasMockup(d));
  const skipped = DESIGNS.length - todo.length;

  if (isTest) {
    todo = todo.slice(0, 1);
    console.log(`\n[TEST MODE] 1枚だけ生成します: ${todo[0].id} ${todo[0].name}\n`);
  } else {
    console.log(`\n対象: ${todo.length} / ${DESIGNS.length}  (スキップ: ${skipped})`);
    console.log(`チャンク: ${CHUNK_SIZE} デザインごとに Photoshop 再起動\n`);
  }

  if (todo.length === 0) {
    console.log('生成するデザインがありません。');
    return;
  }

  // チャンク分割
  const chunks: typeof todo[] = [];
  for (let i = 0; i < todo.length; i += CHUNK_SIZE) {
    chunks.push(todo.slice(i, i + CHUNK_SIZE));
  }

  let totalOk = 0, totalErr = 0;
  const startTime = Date.now();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const free  = diskFreeGB().toFixed(1);
    console.log(`\n──── チャンク ${i + 1}/${chunks.length}  (${chunk.length} 件)  空き容量: ${free} GB ────`);

    // Photoshop を完全終了してから次のチャンク
    killPhotoshop();

    const { ok, err } = runChunk(chunk.map(d => ({ id: d.id, name: d.name })));
    totalOk  += ok;
    totalErr += err;

    // ── エラー検出: 1件でもエラーが出たら停止 ──────────────────────────────
    if (err > 0) {
      console.error(`\n✗ エラー検出（${err}件）。バッチを停止します。`);
      killPhotoshop();
      process.exit(3);
    }

    // ── 重複検証: チャンク内で全 mockup のハッシュがユニークか確認 ─────────
    const hashes = new Map<string, string>();
    for (const d of chunk) {
      const file = path.join(MOCKUPS_DIR, `${d.id}_${slug(d.name)}`, 'pos01.png');
      if (!fs.existsSync(file)) continue;
      const stat = fs.statSync(file);
      if (Date.now() - stat.mtimeMs > 60_000) continue;
      const buf = fs.readFileSync(file);
      const h = crypto.createHash('md5').update(buf).digest('hex');
      if (hashes.has(h)) {
        console.error(`\n✗ 同一画像検出: ${d.id} と ${hashes.get(h)} が同じ柄になっています`);
        console.error(`バグ再発のため停止します。`);
        killPhotoshop();
        process.exit(2);
      }
      hashes.set(h, d.id);
    }

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const remaining = chunks.length - i - 1;
    const avgPerChunk = (Date.now() - startTime) / (i + 1);
    const etaMin = (avgPerChunk * remaining / 1000 / 60).toFixed(0);
    console.log(`進捗: ${totalOk} 成功 / ${totalErr} エラー  経過: ${elapsed}分  残り: ~${etaMin}分`);
  }

  // 最後に Photoshop を終了
  killPhotoshop();

  console.log(`\n─── 完了 ───`);
  console.log(`✓ 生成: ${totalOk}`);
  console.log(`✗ エラー: ${totalErr}`);
}

main().catch(console.error);
