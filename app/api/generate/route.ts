import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const maxDuration = 60; // Imagen 4 Fast は通常 10〜30 秒

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY が設定されていません。Vercel の環境変数、または .env.local を確認してください。' },
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

  // AirPodsケース印刷向けにプロンプトを補強
  const enhancedPrompt = `${prompt}, square seamless repeating pattern, suitable for phone case printing, high resolution, clean edges, 1:1 ratio`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-fast-generate-001',
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/png',
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) {
      return NextResponse.json({ error: '画像データの取得に失敗しました。' }, { status: 500 });
    }

    // base64 → data URL として返す（ブラウザで直接表示可能）
    const dataUrl = `data:image/png;base64,${imageBytes}`;

    return NextResponse.json({
      imageUrl: dataUrl,
      designId,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '不明なエラー';
    console.error('[generate/imagen]', message);
    return NextResponse.json(
      { error: `Gemini Imagen APIエラー: ${message}` },
      { status: 500 }
    );
  }
}
