import { put, get } from '@vercel/blob';
import { NextResponse } from 'next/server';

const BLOB_PATHNAME = 'reviews/reviews.json';
// Vercel本番はpublicストア、ローカルdev環境はprivateストア
// .env.local に BLOB_ACCESS=private を設定するとローカルでも動く
const BLOB_ACCESS = (process.env.BLOB_ACCESS ?? 'public') as 'public' | 'private';

// GET — 現在のレビューデータを返す
export async function GET() {
  try {
    const result = await get(BLOB_PATHNAME, { access: BLOB_ACCESS });
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
      access: BLOB_ACCESS,
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
