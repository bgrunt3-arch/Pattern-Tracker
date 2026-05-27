#!/usr/bin/env tsx
/**
 * update-mockup-urls.ts
 *
 * public/mockups/ をスキャンして public/mockup-urls.json の urls を更新する。
 * - 既存エントリは保持
 * - mockups/{id}_{slug}/pos{NN}.png が見つかったらキー mockups/{id}_{slug}/pos{NN}.jpg を追加
 * - 値はローカルサムネ参照 /mockup-thumbs/{id}_{slug}/pos{NN}.jpg
 *
 * 実行: npm run urls
 */

import fs from 'fs';
import path from 'path';

const MOCKUPS_DIR = path.join(process.cwd(), 'public/mockups');
const URLS_FILE   = path.join(process.cwd(), 'public/mockup-urls.json');

interface Manifest {
  access: string;
  generatedAt: string;
  urls: Record<string, string>;
}

function main() {
  const manifest: Manifest = fs.existsSync(URLS_FILE)
    ? JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'))
    : { access: 'private', generatedAt: new Date().toISOString(), urls: {} };

  const designs = fs.readdirSync(MOCKUPS_DIR).filter(d => {
    try {
      return fs.statSync(path.join(MOCKUPS_DIR, d)).isDirectory();
    } catch {
      return false;
    }
  });

  let added = 0;
  for (const design of designs) {
    const dir = path.join(MOCKUPS_DIR, design);
    const files = fs.readdirSync(dir).filter(f => /^pos\d+\.png$/.test(f));
    for (const file of files) {
      const posJpg = file.replace('.png', '.jpg');
      const key = `mockups/${design}/${posJpg}`;
      if (manifest.urls[key]) continue;
      manifest.urls[key] = `/mockup-thumbs/${design}/${posJpg}`;
      added++;
    }
  }

  fs.writeFileSync(URLS_FILE, JSON.stringify(manifest, null, 2));
  console.log(`✓ mockup-urls.json updated: ${added} new entries added (total: ${Object.keys(manifest.urls).length})`);
}

main();
