import { ImageResponse } from 'next/og';
import { helmMark } from '../lib/icon';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(helmMark({ size: 512, padding: 0.12 }), size);
}
