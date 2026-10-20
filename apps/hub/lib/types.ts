// Shapes stored in apps/hub/data/helm.json (see lib/store.ts). Kept in one place because
// almost every other file in the hub reads or writes one of these.

export type ProjectLifecycleStatus = 'active' | 'paused' | 'archived';
export type DbType = 'mongodb' | 'postgres' | 'mysql' | 'sqlite';
export type HealthState = 'up' | 'degraded' | 'down' | 'unknown';
export type AlertSeverity = 'critical' | 'warning';
export type BackupTrigger = 'manual' | 'schedule';
export type BackupRunStatus = 'running' | 'success' | 'failed';

export interface HealthEndpoint {
  name: string;
  url: string;
  expectStatus: number;
}

export interface Integration {
  id: string;
  provider: string;
  label: string;
  key_name: string;
  value_enc: string;
  createdAt: string;
}

export interface ProjectDatabase {
  type: DbType;
  user: string;
  collections: string[];
  url_enc: string;
  password_enc: string;
}

export interface ProjectBackupConfig {
  enabled: boolean;
  cron: string;
  retentionDays: number;
  driveFolder: string;
}

export interface Project {
  name: string;
  slug: string;
  clientId: string | null;
  /** Free-text client name on records saved before the Clients feature existed. */
  client?: string;
  status: ProjectLifecycleStatus;
  fe_url: string;
  be_url: string;
  health_endpoints: HealthEndpoint[];
  server_host: string;
  pm2_process_names: string[];
  log_paths: string[];
  git: { repo: string; branch: string };
  database: ProjectDatabase;
  backup: ProjectBackupConfig;
  integrations: Integration[];
  collector_token_hash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pm2Process {
  name: string;
  status: string;
  restarts: number;
  uptimeMs: number;
}

export interface CollectorErrorLine {
  at: string;
  file: string;
  line: string;
}

export interface CollectorStatus {
  at: string;
  pm2: Pm2Process[];
  errors: CollectorErrorLine[];
  /** Hostname the collector reported from. Shown so a shared server is identifiable. */
  host?: string;
}

export interface HealthCheckResult {
  name: string;
  url: string;
  status: number | null;
  ms: number;
  ok: boolean;
  error?: string;
  fails?: number;
}

export interface SslResult {
  ok: boolean;
  daysLeft?: number;
  validTo?: string;
  error?: string;
}

export interface DbReachability {
  ok: boolean;
  ms: number;
  host?: string;
  port?: number;
  error?: string;
}

export interface ProjectStatusRecord {
  state: HealthState;
  checkedAt: string;
  checks: HealthCheckResult[];
  collector: CollectorStatus | null;
  ssl: Record<string, SslResult>;
  sslCheckedAt: string | null;
  db: DbReachability | null;
}

export interface BackupRun {
  id: string;
  slug?: string; // only set on the flattened list `allBackupRuns()` returns
  trigger: BackupTrigger;
  status: BackupRunStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  fileName: string;
  bytes?: number;
  driveFileId?: string;
  verified: boolean;
  removedOld?: number;
  error?: string;
}

export interface Alert {
  id: string;
  slug: string;
  key: string;
  severity: AlertSeverity;
  message: string;
  openedAt: string;
  resolvedAt: string | null;
}

/**
 * The Google account Helm uploads backups to. Connected from Settings; the refresh token is
 * encrypted (see lib/crypto.ts) because helm.json sits on disk in plaintext otherwise.
 */
export interface GoogleDriveAuth {
  refreshToken_enc: string;
  /** Shown in Settings so it is obvious which account backups are going to. */
  email: string | null;
  scope: string;
  connectedAt: string;
  lastRefreshAt: string | null;
  /** Google's error code the last time a refresh failed, e.g. 'invalid_grant'. */
  lastError: string | null;
  lastErrorAt: string | null;
}

export interface HelmSettings {
  google?: GoogleDriveAuth;
}

export interface HelmDb {
  projects: Record<string, Project>;
  status: Record<string, ProjectStatusRecord>;
  backups: Record<string, BackupRun[]>;
  alerts: Alert[];
  clients: Record<string, Client>;
  settings: HelmSettings;
}

/** What a collector posts to POST /api/ingest. */
export interface CollectorPayload {
  pm2?: Array<{ name?: string; status?: string; restarts?: number; uptimeMs?: number }>;
  errors?: Array<{ file?: string; line?: string }>;
  /** os.hostname() of the machine the collector runs on. */
  host?: string;
}
