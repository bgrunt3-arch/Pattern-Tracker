import fs from 'fs';
import path from 'path';

// public/mockup-urls.json から pos02 モックアップを持つデザインID一覧を抽出する。
// カタログ（トップ / と /catalog）で共有。
export function getPos02Designs(): string[] {
  const manifestPath = path.join(process.cwd(), 'public/mockup-urls.json');
  const pos02Designs: string[] = [];
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const seen = new Set<string>();
    for (const key of Object.keys(data.urls ?? {})) {
      const parts = key.split('/');
      if (parts.length >= 3 && parts[2].startsWith('pos02')) {
        const id = parts[1].split('_')[0];
        if (!seen.has(id)) { seen.add(id); pos02Designs.push(id); }
      }
    }
  } catch {}
  return pos02Designs;
}
