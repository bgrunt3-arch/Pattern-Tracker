import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 採用/不採用データは全ユーザー共有のため Upstash Redis(KV) に単一キーで保存する。
// Vercel Marketplace で Upstash を接続すると KV_REST_API_URL/TOKEN（または
// UPSTASH_REDIS_REST_URL/TOKEN）が自動注入される。両命名に対応。
const KEY = 'cococase:reviews';

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

type ReviewMap = Record<string, 'adopted' | 'rejected'>;

// GET — 現在の採用/不採用データを返す（未設定時は空）
export async function GET() {
  const redis = getRedis();
  if (!redis) return NextResponse.json({});
  try {
    const data = await redis.get<ReviewMap>(KEY);
    return NextResponse.json(data ?? {});
  } catch {
    return NextResponse.json({});
  }
}

// PUT — 採用/不採用データを上書き保存（全マップ）
export async function PUT(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: 'storage not configured: connect Upstash Redis (KV) in Vercel' },
      { status: 503 },
    );
  }
  try {
    const body = (await req.json()) as ReviewMap;
    await redis.set(KEY, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
