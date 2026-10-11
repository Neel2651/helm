import { ImageResponse } from 'next/og';
import { helmMark } from '../../../lib/icon';

// The sizes the web app manifest asks for, including maskable (Android adaptive icon masking).
const ALLOWED_SIZES = new Set([192, 512]);

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = Number(raw);
  if (!ALLOWED_SIZES.has(size)) {
    return new Response('Not found', { status: 404 });
  }
  // Extra padding so a circular (adaptive/maskable) crop doesn't clip the ring.
  return new ImageResponse(helmMark({ size, padding: 0.18 }), { width: size, height: size });
}
