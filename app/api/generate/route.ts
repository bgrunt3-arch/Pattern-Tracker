import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';
import { DESIGNS } from '@/lib/designs';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PROMPT_PREFIX = 'Flat 2D seamless textile pattern swatch, top-down overhead view, ';
const PROMPT_SUFFIX =
  ', pattern fills entire frame edge to edge, repeating tileable design, no phone, no phone case, no device, no mockup, no 3D object, no product, no border, no frame, no shadow, no text, no watermark, flat textile design only';

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function wrapPrompt(base: string): string {
  const clean = base
    .replace(/^Seamless pattern of /i, '')
    .replace(/,?\s*tileable,?\s*no text\.?$/i, '')
    .replace(/,?\s*tileable\.?$/i, '')
    .replace(/,?\s*no text\.?$/i, '');
  return `${PROMPT_PREFIX}${clean}${PROMPT_SUFFIX}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY が設定されていません。' },
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

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-fast-generate-001',
      prompt: wrapPrompt(prompt),
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

    const generatedAt = new Date().toISOString();

    // Vercel Blob が利用可能な場合はアップロード、なければ base64 で返す
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const design = DESIGNS.find(d => d.id === designId);
      const filename = design
        ? `patterns/${designId}_${slug(design.name)}.png`
        : `patterns/${designId ?? 'unknown'}_${Date.now()}.png`;

      const buffer = Buffer.from(imageBytes, 'base64');
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false,
      });

      return NextResponse.json({ imageUrl: blob.url, designId, generatedAt });
    }

    // fallback: base64 data URL（ローカル開発用）
    return NextResponse.json({
      imageUrl: `data:image/png;base64,${imageBytes}`,
      designId,
      generatedAt,
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
