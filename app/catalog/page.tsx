import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import CatalogClient from './CatalogClient';

export const metadata: Metadata = {
  title: 'COCOcase Catalog',
  description: 'AirPods Pro 3 ケース デザインカタログ',
};

export default function CatalogPage() {
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

  return <CatalogClient pos02Designs={pos02Designs} />;
}
