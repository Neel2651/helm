import { ImageResponse } from 'next/og';
import { helmMark } from '../lib/icon';

// iOS applies its own rounded-corner mask to this square, so no extra shaping is needed here.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(helmMark({ size: 180, padding: 0.14 }), size);
}
