import Link from 'next/link';
import { listProjects, allBackupRuns, listBackupRuns } from '../../../lib/store';
import { driveConfigured, driveNeedsReconnect } from '../../../lib/drive';
import { runBackupNow } from '../../actions';
import { timeAgo } from '../../../components/display';
import BackupStatus from '../../../components/BackupStatus';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Truncate from '@/components/Truncate';

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
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1>Backups</h1>
          <p className="text-muted-foreground text-sm">Database dumps, zipped and encrypted, uploaded to Google Drive.</p>
        </div>
      </header>

      {backupError ? <Alert variant="error">{backupError}</Alert> : null}

      {!driveConfigured() ? (
        <Alert variant="warning">
          Google Drive is not connected, so backups cannot run. <Link href="/settings">Connect it in Settings</Link>.
        </Alert>
      ) : driveNeedsReconnect() ? (
        <Alert variant="error">
          Google has revoked Helm&rsquo;s access, so backups are failing.{' '}
          <Link href="/settings">Reconnect Google Drive</Link>.
        </Alert>
      ) : null}

      <section className="grid grid-stats gap-3.5">
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <div className="text-[13px] font-semibold text-muted-foreground">Projects with backups</div>
          <div className="mt-1 text-[28px] font-bold tracking-tight">{enabled.length}<span className="text-muted-foreground text-base"> / {projects.length}</span></div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <div className="text-[13px] font-semibold text-muted-foreground">Last successful backup</div>
          <div className={`mt-2.5 text-lg font-bold tracking-tight ${lastSuccess ? 'text-up' : 'text-muted-foreground'}`}>
            {lastSuccess ? `${lastSuccess.slug} · ${timeAgo(lastSuccess.startedAt)}` : 'None yet'}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <div className="text-[13px] font-semibold text-muted-foreground">Failed, last 7 days</div>
          <div className={`mt-1 text-[28px] font-bold tracking-tight ${failedThisWeek ? 'text-down' : 'text-foreground'}`}>{failedThisWeek}</div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 overflow-x-auto p-0">
        <div className="flex items-center gap-3 justify-between border-b border-border px-4 py-3.5">
          <h2>Schedules</h2>
          <span className="text-muted-foreground text-sm">Times use the hub machine&rsquo;s timezone</span>
        </div>
        {enabled.length === 0 ? (
          <p className="text-muted-foreground text-sm p-4">
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
                    <td className="font-mono text-[13px] text-muted-foreground">{p.backup.cron}</td>
                    <td>
                      {last ? (
                        <span className="flex items-center gap-3 gap-2">
                          <BackupStatus status={last.status} />
                          <span className="text-muted-foreground text-sm">{timeAgo(last.startedAt)}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </td>
                    <td className="max-w-56 font-mono text-[13px] text-muted-foreground">
                      <Truncate>{p.backup.driveFolder || `Backups/${p.slug}`}</Truncate>
                    </td>
                    <td className="text-right">
                      <form action={runBackupNow.bind(null, p.slug)}>
                        <input type="hidden" name="returnTo" value="/backups" />
                        <Button type="submit" variant="outline" size="sm" disabled={!driveConfigured() || driveNeedsReconnect()}>Run now</Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 overflow-x-auto p-0">
        <div className="flex items-center gap-3 justify-between border-b border-border px-4 py-3.5">
          <h2>Recent runs</h2>
          <span className="text-muted-foreground text-sm">All projects, newest first</span>
        </div>
        {runs.length === 0 ? (
          <p className="text-muted-foreground text-sm p-4">No runs yet.</p>
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
                  <td className="text-muted-foreground text-sm">{new Date(r.startedAt).toLocaleString()}</td>
                  <td><Link href={`/projects/${r.slug}`}>{r.slug}</Link></td>
                  <td className="text-muted-foreground text-sm">{r.trigger}</td>
                  <td className="font-mono text-[13px] text-sm">{formatBytes(r.bytes)}</td>
                  <td className="font-mono text-[13px] text-sm">{r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : '—'}</td>
                  <td>{r.verified ? <span className="text-up">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                  <td>
                    <BackupStatus status={r.status} />
                    {r.error ? <div className="text-sm max-w-90 whitespace-normal text-down">{r.error}</div> : null}
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
