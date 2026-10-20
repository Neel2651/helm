// Rendered by next/og (Satori), which only understands inline style objects:
// no className, no Tailwind. The inline styles here are deliberate.
import { BRAND } from './brand';
interface HelmMarkOptions {
  size: number;
  padding?: number;
  background?: string;
}

// The Helm mark (a ring and a hub, like a ship's wheel), built from plain boxes so it
// renders the same way through next/og's image generator as it does in the UI.
export function helmMark({ size, padding = 0.16, background = BRAND.teal }: HelmMarkOptions) {
  const ring = Math.round(size * (1 - padding * 2));
  const stroke = Math.max(4, Math.round(size * 0.045));
  const hub = Math.round(size * 0.12);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background,
      }}
    >
      <div
        style={{
          width: ring,
          height: ring,
          borderRadius: '50%',
          border: `${stroke}px solid #ffffff`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: hub, height: hub, borderRadius: '50%', background: '#ffffff' }} />
      </div>
    </div>
  );
}
