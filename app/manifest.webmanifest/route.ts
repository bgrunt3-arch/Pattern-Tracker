// /manifest.webmanifest
// PWA manifest

import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    name: 'COCOcase',
    short_name: 'COCOcase',
    description: 'AirPods Pro 3 ケース 605 デザイン採用判定',
    start_url: '/catalog',
    display: 'standalone',
    background_color: '#F5EFE6',
    theme_color: '#F5EFE6',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-rounded-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  });
}
