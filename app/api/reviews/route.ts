import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

const BLOB_PATHNAME = 'reviews/reviews.json';

// GET — 現在のレビューデータを返す
export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'reviews/' });
    const blob = blobs.find(b => b.pathname === BLOB_PATHNAME);
    if (!blob) return NextResponse.json({});

    const res = await fetch(blob.url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({});
  }
}

// PUT — レビューデータを上書き保存
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await put(BLOB_PATHNAME, JSON.stringify(body), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
