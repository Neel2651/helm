import crypto from 'node:crypto';
import { listAlerts, addAlert, updateAlert } from './store';
import { notify } from './notify';
import type {
  Alert,
  AlertSeverity,
  BackupRun,
  DbReachability,
  Pm2Process,
  Project,
  ProjectStatusRecord,
  SslResult,
} from './types';

// An alert is identified by (project, key). While one is open, repeats are ignored.
// Keys: "down", "degraded", "backup", "pm2:<name>", "restarts:<name>".

function openAlert(slug: string, key: string): Alert | null {
  return listAlerts().find((a) => a.slug === slug && a.key === key && !a.resolvedAt) || null;
}

async function raise(slug: string, key: string, severity: AlertSeverity, message: string): Promise<void> {
  if (openAlert(slug, key)) return;
  addAlert({
    id: crypto.randomUUID(),
    slug,
    key,
    severity,
    message,
    openedAt: new Date().toISOString(),
    resolvedAt: null,
  });
  await notify(`${severity === 'critical' ? '🔴' : '🟠'} ${message}`);
}

// Closes an open alert. Returns true if one was open.
function clear(slug: string, key: string): boolean {
  const open = openAlert(slug, key);
  if (!open) return false;
  updateAlert(open.id, { resolvedAt: new Date().toISOString() });
  return true;
}

// Called after every URL check run.
export async function evaluateHealth(project: Project, status: ProjectStatusRecord): Promise<void> {
  const { slug, name } = project;
  const failing = (status.checks || [])
    .filter((c) => !c.ok)
    .map((c) => `${c.name}: ${c.error || c.status}`)
    .join('; ');

  if (status.state === 'down') {
    clear(slug, 'degraded');
    await raise(slug, 'down', 'critical', `${name} is DOWN. ${failing || 'Health check failing.'}`);
  } else if (status.state === 'degraded') {
    clear(slug, 'down');
    await raise(slug, 'degraded', 'warning', `${name} is degraded. ${failing || 'Slow response.'}`);
  } else if (status.state === 'up') {
    const wasOpen = [clear(slug, 'down'), clear(slug, 'degraded')].some(Boolean);
    if (wasOpen) await notify(`✅ ${name} is back up.`);
  }
}

// Called after each collector push. Checks PM2 process state and restart loops.
export async function evaluatePm2(project: Project, processes: Pm2Process[], previous: Pm2Process[]): Promise<void> {
  const { slug, name } = project;
  for (const p of processes) {
    if (p.status === 'errored') {
      await raise(slug, `pm2:${p.name}`, 'critical', `${name}: PM2 process ${p.name} is errored (${p.restarts} restarts).`);
    } else if (clear(slug, `pm2:${p.name}`)) {
      await notify(`✅ ${name}: PM2 process ${p.name} is ${p.status} again.`);
    }

    // Five or more restarts since the previous push is a crash loop.
    const before = previous.find((x) => x.name === p.name);
    const delta = before ? p.restarts - before.restarts : 0;
    if (delta >= 5) {
      await raise(slug, `restarts:${p.name}`, 'warning', `${name}: PM2 process ${p.name} restarted ${delta} times since the last check.`);
    } else {
      clear(slug, `restarts:${p.name}`);
    }
  }
}

// Called after the (roughly daily) SSL check. Warns under 14 days, critical under 3.
export async function evaluateSsl(project: Project, ssl: Record<string, SslResult>): Promise<void> {
  const { slug, name } = project;
  for (const [host, result] of Object.entries(ssl || {})) {
    const key = `ssl:${host}`;
    if (!result.ok || typeof result.daysLeft !== 'number') continue; // don't alert on a fetch failure alone
    if (result.daysLeft <= 3) {
      await raise(slug, key, 'critical', `${name}: TLS certificate for ${host} expires in ${result.daysLeft} day(s).`);
    } else if (result.daysLeft <= 14) {
      await raise(slug, key, 'warning', `${name}: TLS certificate for ${host} expires in ${result.daysLeft} days.`);
    } else if (clear(slug, key)) {
      await notify(`✅ ${name}: TLS certificate for ${host} was renewed.`);
    }
  }
}

// Called after every URL check run. A TCP-level reachability check, not a login.
export async function evaluateDb(project: Project, db: DbReachability | null): Promise<void> {
  const { slug, name } = project;
  if (!db) return;
  if (!db.ok) {
    await raise(slug, 'db', 'critical', `${name}: database is not reachable. ${db.error || ''}`.trim());
  } else if (clear(slug, 'db')) {
    await notify(`✅ ${name}: database is reachable again.`);
  }
}

// Called when a backup run finishes.
export async function evaluateBackup(project: Project, run: Pick<BackupRun, 'status' | 'error'>): Promise<void> {
  const { slug, name } = project;
  if (run.status === 'failed') {
    await raise(slug, 'backup', 'critical', `${name}: backup failed. ${run.error || ''}`.trim());
  } else if (run.status === 'success' && clear(slug, 'backup')) {
    await notify(`✅ ${name}: backup succeeded again.`);
  }
}
