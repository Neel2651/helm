import tls from 'node:tls';
import net from 'node:net';
import dns from 'node:dns';
import fs from 'node:fs/promises';
import { listProjects, getProject, getStatus, setStatus } from './store';
import { decrypt } from './crypto';
import { evaluateHealth, evaluatePm2, evaluateSsl, evaluateDb } from './alerts';
import type {
  CollectorErrorLine,
  CollectorPayload,
  CollectorStatus,
  DbReachability,
  DbType,
  HealthCheckResult,
  HealthEndpoint,
  Pm2Process,
  Project,
  ProjectStatusRecord,
  SslResult,
} from './types';

const INTERVAL_MS = Number(process.env.HELM_CHECK_INTERVAL_SEC || 60) * 1000;
const SLOW_MS = 2000;
const FAIL_THRESHOLD = 3; // consecutive failures before a project is "down"
const TIMEOUT_MS = 8000;
const SSL_RECHECK_MS = 20 * 60 * 60 * 1000; // certificates don't change often

export async function checkEndpoint(endpoint: HealthEndpoint): Promise<HealthCheckResult> {
  const started = Date.now();
  const expectStatus = endpoint.expectStatus || 200;
  try {
    const res = await fetch(endpoint.url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'Helm-health/0.1' },
    });
    return {
      name: endpoint.name,
      url: endpoint.url,
      status: res.status,
      ms: Date.now() - started,
      ok: res.status === expectStatus,
    };
  } catch (err) {
    return {
      name: endpoint.name,
      url: endpoint.url,
      status: null,
      ms: Date.now() - started,
      ok: false,
      error: err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'unreachable',
    };
  }
}

// A TLS certificate's days left on an https host. Checked once a day, not on every cycle.
export function checkSsl(hostname: string): Promise<SslResult> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 8000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert || !cert.valid_to) return resolve({ ok: false, error: 'No certificate returned' });
      const daysLeft = Math.round((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000);
      resolve({ ok: true, daysLeft, validTo: cert.valid_to });
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
    socket.once('error', (err) => resolve({ ok: false, error: err.message.slice(0, 200) }));
  });
}

function httpsHostsFor(project: Project): string[] {
  const urls = [project.fe_url, project.be_url, ...(project.health_endpoints || []).map((e) => e.url)];
  const hosts = urls
    .map((u) => {
      try {
        const parsed = new URL(u);
        return parsed.protocol === 'https:' ? parsed.hostname : null;
      } catch {
        return null;
      }
    })
    .filter((h): h is string => Boolean(h));
  return [...new Set(hosts)];
}

type DbTarget = { kind: 'file'; path: string } | { kind: 'tcp'; host: string; port: number };

// Resolves a connection string to a host and port to test, without a database driver.
// mongodb+srv:// is resolved via its DNS SRV record, per the connection-string spec.
async function dbTarget(type: DbType, rawUrl: string): Promise<DbTarget> {
  if (type === 'sqlite') return { kind: 'file', path: rawUrl };

  const parsed = new URL(rawUrl);
  if (parsed.protocol === 'mongodb+srv:') {
    const records = await dns.promises.resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
    if (!records.length) throw new Error('No SRV records found for this host.');
    return { kind: 'tcp', host: records[0].name, port: records[0].port };
  }

  const defaultPort = ({ 'mongodb:': 27017, 'postgres:': 5432, 'postgresql:': 5432, 'mysql:': 3306 } as Record<string, number>)[
    parsed.protocol
  ];
  const port = Number(parsed.port) || defaultPort;
  if (!parsed.hostname || !port) throw new Error('Could not read a host and port from the connection string.');
  return { kind: 'tcp', host: parsed.hostname, port };
}

// Confirms the database host accepts a connection. This does not check credentials or run a query.
export async function checkDbReachability(project: Project): Promise<DbReachability | null> {
  if (!project.database?.url_enc) return null;
  const started = Date.now();
  try {
    const target = await dbTarget(project.database.type, decrypt(project.database.url_enc));
    if (target.kind === 'file') {
      await fs.access(target.path);
      return { ok: true, ms: Date.now() - started };
    }
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: target.host, port: target.port, timeout: 5000 });
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('timeout'));
      });
      socket.once('error', reject);
    });
    return { ok: true, ms: Date.now() - started, host: target.host, port: target.port };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, ms: Date.now() - started, error: message.slice(0, 200) };
  }
}

// Only health endpoints are checked for uptime. The frontend and backend URLs are also used
// for the daily SSL check. Database reachability is a TCP-level check, not a login.
export async function checkProject(project: Project): Promise<void> {
  const prev = getStatus(project.slug);
  const endpoints = project.health_endpoints || [];

  const checks: HealthCheckResult[] = [];
  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    const before = (prev?.checks || []).find((c) => c.url === endpoint.url);
    result.fails = result.ok ? 0 : (before?.fails || 0) + 1;
    checks.push(result);
  }

  const collector = prev?.collector || null;
  const pm2Errored = (collector?.pm2 || []).some((p) => p.status === 'errored');
  const down = checks.some((c) => (c.fails || 0) >= FAIL_THRESHOLD);
  const degraded = checks.some((c) => !c.ok || c.ms > SLOW_MS) || pm2Errored;

  let state: 'up' | 'degraded' | 'down' | 'unknown' = 'unknown';
  if (checks.length) state = down ? 'down' : degraded ? 'degraded' : 'up';

  let ssl = prev?.ssl || {};
  let sslCheckedAt = prev?.sslCheckedAt || null;
  const sslStale = !sslCheckedAt || Date.now() - new Date(sslCheckedAt).getTime() > SSL_RECHECK_MS;
  const sslHosts = httpsHostsFor(project);
  if (sslHosts.length && sslStale) {
    ssl = {};
    for (const host of sslHosts) ssl[host] = await checkSsl(host);
    sslCheckedAt = new Date().toISOString();
  }

  const db = await checkDbReachability(project);

  const next = {
    ...prev,
    state,
    checkedAt: new Date().toISOString(),
    checks,
    collector,
    ssl,
    sslCheckedAt,
    db,
  };
  setStatus(project.slug, next);
  await evaluateHealth(project, next);
  await evaluateSsl(project, ssl);
  await evaluateDb(project, db);
}

export async function checkAll(): Promise<void> {
  for (const project of listProjects()) {
    try {
      await checkProject(project);
    } catch (err) {
      console.error(`[helm] check failed for ${project.slug}:`, err instanceof Error ? err.message : err);
    }
  }
}

// Collector push: PM2 state and recent error lines from a server.
//
// One collector runs per server and reports everything on that machine, but a server often
// hosts several projects. So the payload is split up here rather than dumped onto whichever
// project owns the token: each project takes the PM2 processes it names in
// pm2_process_names and the errors from the files it names in log_paths.
//
// Anything no project claims falls to the token's own project, which keeps a project that
// has not filled those fields in working exactly as before.
//
// A project is only written to when something in this payload belongs to it. That matters
// once there is more than one server: a push from server B must not blank out the status of
// a project living on server A.
export async function recordCollector(slug: string, payload: CollectorPayload): Promise<void> {
  const now = new Date().toISOString();
  const host = String(payload.host || '').slice(0, 200);

  const pm2All: Pm2Process[] = (Array.isArray(payload.pm2) ? payload.pm2 : []).slice(0, 200).map((p) => ({
    name: String(p.name || '').slice(0, 100),
    status: String(p.status || 'unknown').slice(0, 20),
    restarts: Number(p.restarts) || 0,
    uptimeMs: Number(p.uptimeMs) || 0,
  }));

  const errorsAll: CollectorErrorLine[] = (Array.isArray(payload.errors) ? payload.errors : []).slice(0, 100).map((e) => ({
    at: now,
    file: String(e.file || '').slice(0, 200),
    line: String(e.line || '').slice(0, 500),
  }));

  const projects = listProjects();

  // What each project has asked for by name.
  const claimedProcess = new Set<string>();
  const claimedFile = new Set<string>();
  for (const p of projects) {
    for (const n of p.pm2_process_names || []) claimedProcess.add(n);
    for (const f of p.log_paths || []) claimedFile.add(f);
  }

  const shareFor = (project: Project) => {
    const names = project.pm2_process_names || [];
    const files = project.log_paths || [];
    const isTokenProject = project.slug === slug;

    // Named processes go to the project that named them. A project that named none, and
    // owns the token, picks up whatever nobody else claimed.
    const pm2 = names.length
      ? pm2All.filter((x) => names.includes(x.name))
      : isTokenProject
        ? pm2All.filter((x) => !claimedProcess.has(x.name))
        : [];

    const errors = files.length
      ? errorsAll.filter((e) => files.includes(e.file))
      : isTokenProject
        ? errorsAll.filter((e) => !claimedFile.has(e.file))
        : [];

    return { pm2, errors };
  };

  for (const project of projects) {
    const { pm2, errors } = shareFor(project);
    // Nothing here belongs to this project — leave its status untouched.
    if (pm2.length === 0 && errors.length === 0) continue;

    const prev = getStatus(project.slug);
    const collector: CollectorStatus = {
      at: now,
      host,
      pm2,
      errors: [...(prev?.collector?.errors || []), ...errors].slice(-100),
    };
    const base: ProjectStatusRecord =
      prev ?? { state: 'unknown', checkedAt: new Date(0).toISOString(), checks: [], collector: null, ssl: {}, sslCheckedAt: null, db: null };
    setStatus(project.slug, { ...base, collector });

    // Alerts see only this project's processes, so a crash is reported against the project
    // that actually owns it.
    if (pm2.length) await evaluatePm2(project, pm2, prev?.collector?.pm2 || []);
  }
}


export function startMonitor(): void {
  if (globalThis.__helmMonitorStarted) return;
  globalThis.__helmMonitorStarted = true;
  setTimeout(checkAll, 5000);
  setInterval(checkAll, INTERVAL_MS);
}
