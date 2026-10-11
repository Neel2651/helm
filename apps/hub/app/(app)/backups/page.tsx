import Link from 'next/link';
import { listProjects, allBackupRuns, listBackupRuns } from '../../../lib/store';
import { driveConfigured } from '../../../lib/drive';
import { runBackupNow } from '../../actions';
import { timeAgo } from '../../../components/ui';
import BackupStatus from '../../../components/BackupStatus';

export const dynamic = 'force-dynamic';

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface BackupsPageProps {
  searchParams: Promise<{ backup_error?: string }>;
}

export default async function BackupsPage({ searchParams }: BackupsPageProps) {
  const { backup_error: backupError } = await searchParams;
  const projects = listProjects();
  const enabled = projects.filter((p) => p.backup?.enabled);
  const runs = allBackupRuns();
  const lastSuccess = runs.find((r) => r.status === 'success');
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const failedThisWeek = runs.filter((r) => r.status === 'failed' && new Date(r.startedAt).getTime() > weekAgo).length;

  return (
    <>
      <header className="row-wrap between">
        <div>
          <h1>Backups</h1>
          <p className="muted small">Database dumps, zipped and encrypted, uploaded to Google Drive.</p>
        </div>
      </header>

      {backupError ? <div className="notice notice-error" role="alert">{backupError}</div> : null}

      {!driveConfigured() ? (
        <div className="notice">
          Google Drive is not connected. Set HELM_GOOGLE_CLIENT_ID, HELM_GOOGLE_CLIENT_SECRET and HELM_GOOGLE_REFRESH_TOKEN on the hub, then restart it.
        </div>
      ) : null}

      <section className="grid-stats">
        <div className="card">
          <div className="stat-label">Projects with backups</div>
          <div className="stat-value">{enabled.length}<span className="muted" style={{ fontSize: 16 }}> / {projects.length}</span></div>
        </div>
        <div className="card">
          <div className="stat-label">Last successful backup</div>
          <div className="stat-value" style={{ fontSize: 18, marginTop: 10, color: lastSuccess ? 'var(--up)' : 'var(--muted)' }}>
            {lastSuccess ? `${lastSuccess.slug} · ${timeAgo(lastSuccess.startedAt)}` : 'None yet'}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Failed, last 7 days</div>
          <div className="stat-value" style={{ color: failedThisWeek ? 'var(--down)' : 'var(--text)' }}>{failedThisWeek}</div>
        </div>
      </section>

      <section className="card table-wrap" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2>Schedules</h2>
          <span className="muted small">Times use the hub machine&rsquo;s timezone</span>
        </div>
        {enabled.length === 0 ? (
          <p className="muted small" style={{ padding: 16 }}>
            No backups scheduled. Turn them on in a project&rsquo;s Backups settings.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Schedule</th>
                <th>Last run</th>
                <th>Drive folder</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {enabled.map((p) => {
                const last = listBackupRuns(p.slug)[0];
                return (
                  <tr key={p.slug}>
                    <td><Link href={`/projects/${p.slug}`}><strong>{p.name}</strong></Link></td>
                    <td className="mono muted">{p.backup.cron}</td>
                    <td>
                      {last ? (
                        <span className="row" style={{ gap: 8 }}>
                          <BackupStatus status={last.status} />
                          <span className="muted small">{timeAgo(last.startedAt)}</span>
                        </span>
                      ) : (
                        <span className="muted small">Never</span>
                      )}
                    </td>
                    <td className="mono muted small">{p.backup.driveFolder || `Backups/${p.slug}`}</td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={runBackupNow.bind(null, p.slug)}>
                        <input type="hidden" name="returnTo" value="/backups" />
                        <button type="submit" className="btn btn-sm" disabled={!driveConfigured()}>Run now</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="card table-wrap" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2>Recent runs</h2>
          <span className="muted small">All projects, newest first</span>
        </div>
        {runs.length === 0 ? (
          <p className="muted small" style={{ padding: 16 }}>No runs yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Started</th>
                <th>Project</th>
                <th>Trigger</th>
                <th>Size</th>
                <th>Duration</th>
                <th>Verified</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 30).map((r) => (
                <tr key={r.id}>
                  <td className="muted small">{new Date(r.startedAt).toLocaleString()}</td>
                  <td><Link href={`/projects/${r.slug}`}>{r.slug}</Link></td>
                  <td className="muted small">{r.trigger}</td>
                  <td className="mono small">{formatBytes(r.bytes)}</td>
                  <td className="mono small">{r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : '—'}</td>
                  <td>{r.verified ? <span style={{ color: 'var(--up)' }}>Yes</span> : <span className="muted">No</span>}</td>
                  <td>
                    <BackupStatus status={r.status} />
                    {r.error ? <div className="small" style={{ color: 'var(--down)', whiteSpace: 'normal', maxWidth: 360 }}>{r.error}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
