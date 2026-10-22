import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { getProject, addBackupRun, updateBackupRun, allBackupRuns } from './store';
import { decrypt, encryptBuffer } from './crypto';
import { driveConfigured, driveNeedsReconnect, ensureFolderPath, uploadBackup, deleteOldBackups } from './drive';
import { evaluateBackup } from './alerts';
import type { BackupRun, BackupTrigger, DbType, Project } from './types';

// One backup at a time per project.
const running = new Set<string>();
const DUMP_TIMEOUT_MS = 60 * 60 * 1000;

function run(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // killSignal defaults to SIGTERM, which a process can catch, delay, or (for a child it
    // spawned itself, like mongodump's connection handling) simply not act on promptly. A
    // mongodump stuck waiting on a paused/unreachable Atlas cluster can sit past its deadline
    // for hours with SIGTERM alone. SIGKILL cannot be caught or ignored, so the timeout is real.
    execFile(cmd, args, { timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const reason =
          (err as NodeJS.ErrnoException).code === 'ENOENT' ? 'is not installed on the hub machine' : (stderr || err.message).trim().slice(0, 300);
        return reject(new Error(`${cmd} ${reason}`));
      }
      resolve(stdout);
    });
  });
}

async function dumpDatabase(type: DbType, url: string, file: string): Promise<void> {
  if (type === 'mongodb') {
    // The whole database as one gzipped archive — every collection, deliberately. There's
    // no per-collection scoping, so nothing has to be kept in sync with what's actually in
    // the database as collections are added.
    await run('mongodump', ['--uri', url, '--gzip', `--archive=${file}`], DUMP_TIMEOUT_MS);
    return;
  }
  if (type === 'postgres') {
    await run('pg_dump', ['--format=custom', '--file', file, url], DUMP_TIMEOUT_MS);
    return;
  }
  if (type === 'sqlite') {
    await fs.copyFile(url, file);
    return;
  }
  throw new Error(`Backups for ${type} are not supported yet.`);
}

// Keep secrets out of logs and error messages shown in the UI.
function redact(message: string, secrets: Array<string | undefined>): string {
  return secrets.filter((s): s is string => Boolean(s)).reduce((msg, s) => msg.split(s).join('[redacted]'), message);
}

/**
 * Marks any backup run still "running" as failed. Call once when the hub boots.
 *
 * The `running` guard above is an in-memory Set, so it always starts empty on a fresh
 * process — nothing can legitimately still be "running" from before this boot. A record
 * stuck at "running" was orphaned by the hub stopping mid-backup (a deploy, a crash), and
 * without this it stays stuck forever, since nothing else ever calls finish() for it.
 */
export async function recoverStaleBackups(): Promise<void> {
  const error = 'Interrupted: the hub restarted while this backup was running.';
  for (const run of allBackupRuns()) {
    if (run.status !== 'running' || !run.slug) continue;
    updateBackupRun(run.slug, run.id, { status: 'failed', finishedAt: new Date().toISOString(), error });
    const project = getProject(run.slug);
    if (project) await evaluateBackup(project, { status: 'failed', error });
  }
}

export interface StartedBackup {
  id: string;
  done: Promise<void>;
}

// Starts a backup. Checks configuration synchronously so the UI can show a clear error.
// The dump and upload continue in the background. `done` resolves when the run has finished.
export function startBackup(slug: string, trigger: BackupTrigger = 'manual'): StartedBackup {
  const project = getProject(slug);
  if (!project) throw new Error('Project not found.');
  if (running.has(slug)) throw new Error('A backup is already running for this project.');
  if (!driveConfigured()) {
    throw new Error('Google Drive is not connected. Connect it in Settings.');
  }
  if (driveNeedsReconnect()) {
    throw new Error('Google has revoked Helm\u2019s access to Drive. Reconnect it in Settings.');
  }
  if (!project.database?.url_enc) throw new Error('No database connection string is saved for this project.');

  const id = crypto.randomUUID();
  const startedAt = new Date();
  const fileName = `${slug}-${startedAt.toISOString().replace(/[:.]/g, '-')}.zip.enc`;

  addBackupRun(slug, {
    id,
    trigger,
    status: 'running',
    startedAt: startedAt.toISOString(),
    fileName,
    verified: false,
  });

  running.add(slug);
  const done = execute(project, { id, startedAt, fileName }).finally(() => running.delete(slug));
  return { id, done };
}

interface ExecuteContext {
  id: string;
  startedAt: Date;
  fileName: string;
}

async function execute(project: Project, { id, startedAt, fileName }: ExecuteContext): Promise<void> {
  const slug = project.slug;
  const type = project.database.type || 'mongodb';
  const secrets: Array<string | undefined> = [];
  let dir: string | null = null;

  const finish = async (patch: Partial<BackupRun>) => {
    updateBackupRun(slug, id, {
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      ...patch,
    });
    await evaluateBackup(project, { status: patch.status ?? 'failed', error: patch.error });
  };

  try {
    const dbUrl = decrypt(project.database.url_enc);
    const dbPassword = project.database.password_enc ? decrypt(project.database.password_enc) : '';
    secrets.push(dbUrl, dbPassword);

    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'helm-backup-'));
    const base = fileName.replace(/\.zip\.enc$/, '');

    const dumpFile = path.join(dir, `${base}.${type === 'postgres' ? 'dump' : 'archive'}`);
    await dumpDatabase(type, dbUrl, dumpFile);

    const zipFile = path.join(dir, `${base}.zip`);
    await run('zip', ['-j', '-q', zipFile, dumpFile], 10 * 60 * 1000);

    const encrypted = encryptBuffer(await fs.readFile(zipFile));
    const localMd5 = crypto.createHash('md5').update(encrypted).digest('hex');

    const folderId = await ensureFolderPath(project.backup?.driveFolder || `Backups/${slug}`);
    const uploaded = await uploadBackup(folderId, fileName, encrypted);
    if (uploaded.md5Checksum !== localMd5) {
      throw new Error('Upload check failed: the Drive copy does not match the local file.');
    }

    const removed = await deleteOldBackups(folderId, project.backup?.retentionDays || 30);
    await finish({ status: 'success', bytes: encrypted.length, driveFileId: uploaded.id, verified: true, removedOld: removed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finish({ status: 'failed', error: redact(message, secrets) });
  } finally {
    if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
