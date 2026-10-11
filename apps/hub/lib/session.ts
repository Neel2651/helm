// Signed session cookie. Uses Web Crypto so it also runs in Next.js middleware (edge runtime).
const encoder = new TextEncoder();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(process.env.HELM_SESSION_SECRET || ''),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const SESSION_MAX_AGE = SEVEN_DAYS_MS / 1000;

export async function createSessionValue(): Promise<string> {
  const expires = String(Date.now() + SEVEN_DAYS_MS);
  return `${expires}.${await sign(expires)}`;
}

export async function verifySessionValue(value: string | null | undefined): Promise<boolean> {
  if (!value || !process.env.HELM_SESSION_SECRET) return false;
  const [expires, signature] = value.split('.');
  if (!expires || !signature) return false;
  if (Number(expires) < Date.now()) return false;
  return (await sign(expires)) === signature;
}
