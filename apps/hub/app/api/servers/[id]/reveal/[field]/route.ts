import { NextResponse } from 'next/server';
import { getServer } from '../../../../../../lib/store';
import { decrypt } from '../../../../../../lib/crypto';

// Decrypts one server credential on demand (password or SSH key). Nothing decrypted is ever
// stored or logged — this exists only so the reveal dialog has something to show and copy.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; field: string }> }) {
  const { id, field } = await params;
  const server = getServer(id);
  if (!server) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const enc = field === 'password' ? server.password_enc : field === 'ssh_key' ? server.ssh_key_enc : null;
  if (enc === null) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ value: decrypt(enc) }, { headers: { 'cache-control': 'no-store' } });
}
