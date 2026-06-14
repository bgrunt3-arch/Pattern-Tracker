import type { Metadata } from 'next';
import CatalogClient from '../catalog/CatalogClient';
import { getPos02Designs } from '@/lib/pos02';

export const metadata: Metadata = {
  title: 'COCOcase 社内レビュー',
  robots: { index: false, follow: false },
};

// 社内レビュー用：全デザイン表示＋採用/不採用操作（書き込みは REVIEW_PASSWORD で保護）
export default function ReviewPage() {
  return <CatalogClient pos02Designs={getPos02Designs()} reviewMode />;
}
