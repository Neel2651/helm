import { NextResponse } from 'next/server';
import { findByCollectorHash } from '../../../lib/store';
import { recordCollector } from '../../../lib/monitor';
import { hashToken } from '../../../lib/crypto';
import type { CollectorPayload } from '../../../lib/types';

// Collector push endpoint. Authenticated by the project's collector token, not the session.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 401 });

  const project = findByCollectorHash(hashToken(token));
  if (!project) return NextResponse.json({ error: 'invalid token' }, { status: 401 });

  const body: CollectorPayload | null = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  await recordCollector(project.slug, body);
  return NextResponse.json({ ok: true });
}
