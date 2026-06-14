import type { Metadata } from 'next';
import { M_PLUS_Rounded_1c } from 'next/font/google';
import './globals.css';

// ロゴ（丸みのある親しみやすい雰囲気）に合わせた丸ゴシック
const rounded = M_PLUS_Rounded_1c({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-rounded',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'COCOcase',
  description: 'AirPods Pro 3 ケース 605 デザイン採用判定',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'COCOcase',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
};

export const viewport = {
  themeColor: '#3DA9F4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={rounded.variable}>
      <body>{children}</body>
    </html>
  );
}
