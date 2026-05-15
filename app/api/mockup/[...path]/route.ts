// /api/mockup/{id}_{slug}/pos01.jpg
// モックアップを Vercel Blob (JPEG) から取得して返す。
// ローカル開発時は public/mockups/*.png を JPEG 変換して返す。

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

let urlMapCache: Record<string, string> | null = null;

function getUrlMap(): Record<string, string> {
  if (!urlMapCache) {
    try {
      const jsonPath = path.join(process.cwd(), 'public/mockup-urls.json');
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      urlMapCache = raw.urls ?? {};
    } catch {
      urlMapCache = {};
    }
  }
  return urlMapCache!;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await ctx.params;
  if (!segments?.length) return new NextResponse('not found', { status: 404 });

  const subpath = segments.join('/');                 // "003_vintage_rose/pos01.jpg"
  const blobKey = `mockups/${subpath}`;

  // ① ローカル: public/mockups/{...}/pos01.png を JPEG 化して返す
  if (process.env.NODE_ENV !== 'production') {
    const pngPath = path.join(process.cwd(), 'public/mockups', subpath.replace(/\.jpg$/, '.png'));
    if (fs.existsSync(pngPath)) {
      const jpg = await sharp(pngPath)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 85 })
        .toBuffer();
      return new NextResponse(new Uint8Array(jpg), {
        status : 200,
        headers: {
          'Content-Type'  : 'image/jpeg',
          'Cache-Control' : 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
        },
      });
    }
  }

  // ② mockup-urls.json から Blob URL を引いてプロキシ
  const blobUrl = getUrlMap()[blobKey];
  if (!blobUrl) return new NextResponse('not found', { status: 404 });

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(blobUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return new NextResponse('not found', { status: 404 });
    return new NextResponse(res.body as ReadableStream, {
      status : 200,
      headers: {
        'Content-Type'  : res.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control' : 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    console.error('mockup proxy error:', e);
    return new NextResponse('not found', { status: 404 });
  }
}
