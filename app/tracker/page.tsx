import type { Metadata } from 'next';
import PatternTracker from '@/components/PatternTracker';

export const metadata: Metadata = {
  title: 'COCOcase Pattern Tracker',
  description: 'デザイン生成・進捗管理（社内用）',
};

export default function TrackerPage() {
  return <PatternTracker />;
}
