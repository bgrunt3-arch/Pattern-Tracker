// /api/mockup/{id}_{slug}/pos01.jpg
// モックアップを Vercel Blob (JPEG) から取得して返す。
// ローカル開発時は public/mockups/*.png を JPEG 変換して返す。

import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const BLOB_ACCESS = (process.env.BLOB_ACCESS ?? 'private') as 'public' | 'private';

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

  // ② Vercel Blob から取得
  try {
    const result = await get(blobKey, { access: BLOB_ACCESS });
    if (!result) return new NextResponse('not found', { status: 404 });
    return new NextResponse(result.stream as unknown as ReadableStream, {
      status : 200,
      headers: {
        'Content-Type'  : result.blob?.contentType ?? 'image/jpeg',
        'Cache-Control' : 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    console.error('mockup proxy error:', e);
    return new NextResponse('not found', { status: 404 });
  }
}
