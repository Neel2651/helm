import fs from 'node:fs';
import path from 'node:path';
import type { Alert, BackupRun, Client, GoogleDriveAuth, HelmDb, Project, ProjectStatusRecord } from './types';

// JSON file store for the MVP. Swap for Postgres (Drizzle) when the hub moves to a server.
const FILE = process.env.HELM_DATA_FILE || path.join(process.cwd(), 'data', 'helm.json');

function read(): HelmDb {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return {
      projects: parsed.projects || {},
      status: parsed.status || {},
      backups: parsed.backups || {},
      alerts: parsed.alerts || [],
      clients: parsed.clients || {},
      settings: parsed.settings || {},
    };
  } catch {
    return { projects: {}, status: {}, backups: {}, alerts: [], clients: {}, settings: {} };
  }
}

function write(db: HelmDb): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

export function listProjects(): Project[] {
  return Object.values(read().projects).sort((a, b) => a.name.localeCompare(b.name));
}

export function getProject(slug: string): Project | null {
  return read().projects[slug] || null;
}

export function findByCollectorHash(hash: string): Project | null {
  return listProjects().find((p) => p.collector_token_hash === hash) || null;
}

// Creates or updates a project. If the slug changed, the old record is removed.
export function upsertProject(previousSlug: string | null, data: Project): void {
  const db = read();
  if (previousSlug && previousSlug !== data.slug) {
    delete db.projects[previousSlug];
    delete db.status[previousSlug];
    if (db.backups[previousSlug]) {
      db.backups[data.slug] = db.backups[previousSlug];
      delete db.backups[previousSlug];
    }
  }
  db.projects[data.slug] = data;
  write(db);
}

export function deleteProject(slug: string): void {
  const db = read();
  delete db.projects[slug];
  delete db.status[slug];
  delete db.backups[slug];
  db.alerts = db.alerts.filter((a) => a.slug !== slug);
  write(db);
}

// Alerts, newest first, capped at 500.
export function listAlerts(): Alert[] {
  return read().alerts;
}

export function addAlert(alert: Alert): void {
  const db = read();
  db.alerts = [alert, ...db.alerts].slice(0, 500);
  write(db);
}

export function updateAlert(id: string, patch: Partial<Alert>): void {
  const db = read();
  db.alerts = db.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a));
  write(db);
}

// Backup runs, newest first, capped at 100 per project.
export function addBackupRun(slug: string, run: BackupRun): void {
  const db = read();
  db.backups[slug] = [run, ...(db.backups[slug] || [])].slice(0, 100);
  write(db);
}

export function updateBackupRun(slug: string, id: string, patch: Partial<BackupRun>): void {
  const db = read();
  db.backups[slug] = (db.backups[slug] || []).map((r) => (r.id === id ? { ...r, ...patch } : r));
  write(db);
}

export function listBackupRuns(slug: string): BackupRun[] {
  return read().backups[slug] || [];
}

export function allBackupRuns(): BackupRun[] {
  const { backups } = read();
  return Object.entries(backups)
    .flatMap(([slug, runs]) => runs.map((r) => ({ ...r, slug })))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function listClients(): Client[] {
  return Object.values(read().clients).sort((a, b) => a.name.localeCompare(b.name));
}

export function getClient(id: string): Client | null {
  return read().clients[id] || null;
}

export function upsertClient(data: Client): void {
  const db = read();
  db.clients[data.id] = data;
  write(db);
}

export function deleteClient(id: string): void {
  const db = read();
  delete db.clients[id];
  write(db);
}

export function projectsForClient(id: string): Project[] {
  return listProjects().filter((p) => p.clientId === id);
}

// A project's client name, whether it has a linked client or (on older records) just free text.
export function clientNameFor(project: Project): string | null {
  if (project.clientId) return getClient(project.clientId)?.name || null;
  return project.client || null;
}

export function getStatus(slug: string): ProjectStatusRecord | null {
  return read().status[slug] || null;
}

export function getAllStatus(): Record<string, ProjectStatusRecord> {
  return read().status;
}

export function setStatus(slug: string, status: ProjectStatusRecord): void {
  const db = read();
  db.status[slug] = status;
  write(db);
}

// Google Drive connection. One account for the whole hub, so this lives in settings
// rather than on a project.
export function getGoogleAuth(): GoogleDriveAuth | null {
  return read().settings.google || null;
}

export function setGoogleAuth(patch: Partial<GoogleDriveAuth>): void {
  const db = read();
  const current = db.settings.google;
  db.settings.google = {
    refreshToken_enc: '',
    email: null,
    scope: '',
    connectedAt: new Date().toISOString(),
    lastRefreshAt: null,
    lastError: null,
    lastErrorAt: null,
    ...current,
    ...patch,
  };
  write(db);
}

export function clearGoogleAuth(): void {
  const db = read();
  delete db.settings.google;
  write(db);
}
