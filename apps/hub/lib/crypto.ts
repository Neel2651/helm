import crypto from 'node:crypto';

// AES-256-GCM. The key is derived from HELM_ENCRYPTION_KEY.
// Stored format: v1:<iv>:<authTag>:<ciphertext> (base64 parts).

function key(): Buffer {
  const raw = process.env.HELM_ENCRYPTION_KEY;
  if (!raw) throw new Error('HELM_ENCRYPTION_KEY is not set');
  return crypto.createHash('sha256').update(raw).digest();
}

export function encrypt(plain: string | null | undefined): string {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decrypt(value: string | null | undefined): string {
  if (!value) return '';
  const [version, iv, tag, ct] = value.split(':');
  if (version !== 'v1') throw new Error('Unknown secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
}

// Binary files (backups). Layout: iv (12 bytes) | auth tag (16 bytes) | ciphertext.
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

export function decryptBuffer(data: Buffer): Buffer {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
}

// What the UI may show: never the full value, only the last 4 characters.
export function maskSecret(value: string | null | undefined): string {
  if (!value) return '';
  const plain = decrypt(value);
  return plain.length > 4 ? `••••••••${plain.slice(-4)}` : '••••';
}

export function newCollectorToken(): string {
  return `hlm_${crypto.randomBytes(24).toString('base64url')}`;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
