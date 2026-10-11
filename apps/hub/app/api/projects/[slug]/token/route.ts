import { NextResponse } from 'next/server';
import { getProject, upsertProject } from '../../../../../lib/store';
import { newCollectorToken, hashToken } from '../../../../../lib/crypto';

// Rotates a project's collector token. The plain token is returned once and never stored.
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const token = newCollectorToken();
  project.collector_token_hash = hashToken(token);
  project.updatedAt = new Date().toISOString();
  upsertProject(slug, project);

  return NextResponse.json({ token }, { headers: { 'cache-control': 'no-store' } });
}
