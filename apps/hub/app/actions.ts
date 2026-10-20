'use server';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSessionValue, SESSION_MAX_AGE } from '../lib/session';
import { encrypt } from '../lib/crypto';
import {
  getProject,
  upsertProject,
  deleteProject,
  getClient,
  upsertClient,
  deleteClient,
  projectsForClient,
} from '../lib/store';
import { startBackup } from '../lib/backup';
import { disconnectDrive, driveStatus } from '../lib/drive';
import { notify } from '../lib/notify';
import type { HealthEndpoint, Project, ProjectLifecycleStatus } from '../lib/types';

const COOKIE = 'helm_session';

function text(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim();
}

function list(value: FormDataEntryValue | null): string[] {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Lines of "name | url | expected status"
function parseHealthEndpoints(value: FormDataEntryValue | null): HealthEndpoint[] {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, url, expect] = line.split('|').map((s) => s.trim());
      return { name: name || url, url, expectStatus: Number(expect) || 200 };
    })
    .filter((e) => /^https?:\/\//.test(e.url || ''));
}

export async function login(formData: FormData): Promise<void> {
  const given = Buffer.from(text(formData, 'password'));
  const expected = Buffer.from(process.env.HELM_PASSWORD || '');
  const ok = expected.length > 0 && given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!ok) redirect('/login?error=1');

  const jar = await cookies();
  jar.set(COOKIE, await createSessionValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect('/');
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
  redirect('/login');
}

// Create (originalSlug = null) or update a project.
// Blank secret fields keep the stored value.
export async function saveProject(originalSlug: string | null, formData: FormData): Promise<void> {
  const existing = originalSlug ? getProject(originalSlug) : null;

  const name = text(formData, 'name');
  if (!name) throw new Error('Project name is required.');

  const slug = slugify(text(formData, 'slug') || name);
  if (!slug) throw new Error('Slug is invalid.');
  if (slug !== originalSlug && getProject(slug)) {
    throw new Error(`A project with the slug "${slug}" already exists.`);
  }

  const dbUrl = text(formData, 'db_url');
  const dbPassword = text(formData, 'db_password');

  const data: Project = {
    name,
    slug,
    // 'none' is the Select's stand-in for an empty value, which Radix does not allow.
    clientId: ((v) => (v && v !== 'none' ? v : null))(text(formData, 'client_id')),
    status: (text(formData, 'status') || 'active') as ProjectLifecycleStatus,
    fe_url: text(formData, 'fe_url'),
    be_url: text(formData, 'be_url'),
    health_endpoints: parseHealthEndpoints(formData.get('health')),
    server_host: text(formData, 'server_host'),
    pm2_process_names: list(formData.get('pm2')),
    log_paths: list(formData.get('logs')),
    git: {
      repo: text(formData, 'git_repo'),
      branch: text(formData, 'git_branch') || 'main',
    },
    database: {
      type: (text(formData, 'db_type') || 'mongodb') as Project['database']['type'],
      user: text(formData, 'db_user'),
      collections: list(formData.get('collections')),
      url_enc: dbUrl ? encrypt(dbUrl) : existing?.database?.url_enc || '',
      password_enc: dbPassword ? encrypt(dbPassword) : existing?.database?.password_enc || '',
    },
    backup: {
      enabled: formData.get('backup_enabled') === 'on',
      cron: text(formData, 'backup_cron') || '0 2 * * *',
      retentionDays: Number(text(formData, 'backup_retention')) || 30,
      driveFolder: text(formData, 'backup_drive_folder'),
    },
    integrations: existing?.integrations || [],
    collector_token_hash: existing?.collector_token_hash || '',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  upsertProject(originalSlug, data);
  revalidatePath('/', 'layout');
  redirect(`/projects/${slug}`);
}

export async function removeProject(slug: string): Promise<void> {
  deleteProject(slug);
  revalidatePath('/', 'layout');
  redirect('/projects');
}

export async function addIntegration(slug: string, formData: FormData): Promise<void> {
  const project = getProject(slug);
  if (!project) throw new Error('Project not found.');

  const value = text(formData, 'value');
  const keyName = text(formData, 'key_name');
  if (!value || !keyName) throw new Error('Key name and value are required.');

  project.integrations = [
    ...(project.integrations || []),
    {
      id: crypto.randomUUID(),
      provider: text(formData, 'provider') || 'other',
      label: text(formData, 'label') || keyName,
      key_name: keyName,
      value_enc: encrypt(value),
      createdAt: new Date().toISOString(),
    },
  ];
  upsertProject(slug, project);
  revalidatePath(`/projects/${slug}`);
  redirect(`/projects/${slug}`);
}

// Starts a backup now. Config problems are returned to the page as an error message.
export async function runBackupNow(slug: string, formData: FormData): Promise<void> {
  const back = String(formData?.get('returnTo') || '/backups');
  const returnTo = back.startsWith('/') && !back.startsWith('//') ? back : '/backups';
  try {
    startBackup(slug, 'manual');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    redirect(`${returnTo}?backup_error=${encodeURIComponent(message)}`);
  }
  revalidatePath('/backups');
  revalidatePath(`/projects/${slug}`);
  redirect(returnTo);
}

export async function sendTestAlert(): Promise<void> {
  const result = await notify('Helm test: alerts are working.');
  redirect(`/alerts?test=${result.sent ? 'ok' : encodeURIComponent(result.reason || 'failed')}`);
}

export async function removeIntegration(slug: string, id: string): Promise<void> {
  const project = getProject(slug);
  if (!project) throw new Error('Project not found.');
  project.integrations = (project.integrations || []).filter((i) => i.id !== id);
  upsertProject(slug, project);
  revalidatePath(`/projects/${slug}`);
}

// Create (id = null) or update a client.
export async function saveClient(id: string | null, formData: FormData): Promise<void> {
  const name = text(formData, 'name');
  if (!name) throw new Error('Client name is required.');

  const existing = id ? getClient(id) : null;
  const clientId = id || crypto.randomUUID();

  upsertClient({
    id: clientId,
    name,
    company: text(formData, 'company'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone'),
    notes: text(formData, 'notes'),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  revalidatePath('/clients');
  revalidatePath('/', 'layout');
  redirect(`/clients/${clientId}`);
}

// Refuses to delete a client that is still linked to a project.
export async function removeClient(id: string): Promise<void> {
  const linked = projectsForClient(id);
  if (linked.length > 0) {
    const names = linked.map((p) => p.name).join(', ');
    redirect(`/clients/${id}?error=${encodeURIComponent(`Unlink ${linked.length} project(s) first: ${names}`)}`);
  }
  deleteClient(id);
  revalidatePath('/clients');
  redirect('/clients');
}

// --- Google Drive connection ------------------------------------------------------------

export async function disconnectGoogleDrive(): Promise<void> {
  await disconnectDrive();
  revalidatePath('/settings');
  revalidatePath('/backups');
  redirect('/settings?google_disconnected=1');
}

// Forces a real token exchange so the page stops guessing from config alone.
export async function testGoogleDrive(): Promise<void> {
  const status = await driveStatus();
  revalidatePath('/settings');
  const query = status.connected
    ? 'google_ok=1'
    : `google_error=${encodeURIComponent(status.error || 'Google Drive is not connected.')}`;
  redirect(`/settings?${query}`);
}
