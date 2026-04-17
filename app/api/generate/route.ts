import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60; // DALL-E 3 can take up to ~30s

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY が設定されていません。.env.local を確認してください。' },
      { status: 500 }
    );
  }

  let body: { prompt?: string; designId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です。' }, { status: 400 });
  }

  const { prompt, designId } = body;
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt が必要です。' }, { status: 400 });
  }

  // AirPodsケース用にプロンプトを最適化
  const enhancedPrompt = `${prompt}, square seamless repeating pattern, suitable for phone case printing, high resolution, clean edges, 1:1 ratio`;

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    });

    const imageUrl = response.data?.[0]?.url ?? null;
    const revisedPrompt = response.data?.[0]?.revised_prompt ?? null;

    if (!imageUrl) {
      return NextResponse.json({ error: '画像URLの取得に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl,
      revisedPrompt,
      designId,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '不明なエラー';
    console.error('[generate]', message);
    return NextResponse.json(
      { error: `OpenAI APIエラー: ${message}` },
      { status: 500 }
    );
  }
}
