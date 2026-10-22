import { NextResponse } from 'next/server';
import { getProject } from '../../../../../../../lib/store';
import { decrypt } from '../../../../../../../lib/crypto';

// Decrypts one integration's value on demand. Nothing decrypted is ever stored or logged —
// this exists only so the dialog that asks for it has something to show and copy.
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const project = getProject(slug);
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const integration = (project.integrations || []).find((i) => i.id === id);
  if (!integration) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const value = decrypt(integration.value_enc);
  return NextResponse.json({ value }, { headers: { 'cache-control': 'no-store' } });
}
