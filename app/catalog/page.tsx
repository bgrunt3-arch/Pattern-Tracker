import type { Metadata } from 'next';
import CatalogClient from './CatalogClient';

export const metadata: Metadata = {
  title: 'COCOcase Catalog',
  description: 'AirPods Pro 3 ケース デザインカタログ',
};

export default function CatalogPage() {
  return <CatalogClient />;
}
