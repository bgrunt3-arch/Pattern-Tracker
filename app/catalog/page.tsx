import type { Metadata } from 'next';
import CatalogClient from './CatalogClient';
import { getPos02Designs } from '@/lib/pos02';

export const metadata: Metadata = {
  title: 'COCOcase Catalog',
  description: 'AirPods Pro 3 ケース デザインカタログ',
};

export default function CatalogPage() {
  return <CatalogClient pos02Designs={getPos02Designs()} />;
}
