import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const manifestPath = path.join(process.cwd(), 'public', 'generated', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return NextResponse.json({});
  }
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({});
  }
}
