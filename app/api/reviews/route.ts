import { put, get } from '@vercel/blob';
import { NextResponse } from 'next/server';

const BLOB_PATHNAME = 'reviews/reviews.json';

// GET — 現在のレビューデータを返す
export async function GET() {
  try {
    const result = await get(BLOB_PATHNAME, { access: 'private' });
    if (!result) return NextResponse.json({});
    const text = await new Response(result.stream).text();
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({});
  }
}

// PUT — レビューデータを上書き保存
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    await put(BLOB_PATHNAME, JSON.stringify(body), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
