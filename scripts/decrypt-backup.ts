#!/usr/bin/env node
// Decrypts a Helm backup so you can unzip it and restore.
//
//   HELM_ENCRYPTION_KEY=... npm run backup:decrypt -- <file.zip.enc> <out.zip>
//
// Then unzip out.zip. Inside is a MongoDB archive (.archive, gzipped) or a Postgres custom dump (.dump).
// Restore with: mongorestore --uri "$URI" --gzip --archive=<file>   or   pg_restore --clean --dbname "$URL" <file>

import fs from 'node:fs';
import crypto from 'node:crypto';

const [, , input, output] = process.argv;

if (!input || !output) {
  console.error('Usage: npm run backup:decrypt -- <file.zip.enc> <out.zip>');
  process.exit(1);
}
if (!process.env.HELM_ENCRYPTION_KEY) {
  console.error('Set HELM_ENCRYPTION_KEY to the same value the hub uses.');
  process.exit(1);
}

// Same key derivation and layout as apps/hub/lib/crypto.ts: iv (12) | auth tag (16) | ciphertext.
const key = crypto.createHash('sha256').update(process.env.HELM_ENCRYPTION_KEY).digest();
const data = fs.readFileSync(input);
const decipher = crypto.createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
decipher.setAuthTag(data.subarray(12, 28));

try {
  const plain = Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
  fs.writeFileSync(output, plain);
  console.log(`Wrote ${output}`);
} catch {
  console.error('Decryption failed. Check that HELM_ENCRYPTION_KEY matches the key used for this backup.');
  process.exit(1);
}
