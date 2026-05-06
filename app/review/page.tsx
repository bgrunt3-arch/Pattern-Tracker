import type { Metadata } from 'next';
import ReviewClient from './ReviewClient';

export const metadata: Metadata = {
  title: 'COCOcase Review',
  description: 'デザイン採用・不採用の仕分け',
};

export default function ReviewPage() {
  return <ReviewClient />;
}
