import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, getStatus, listBackupRuns, clientNameFor } from '../../../../lib/store';
import { maskSecret } from '../../../../lib/crypto';
import { driveConfigured } from '../../../../lib/drive';
import { StateBadge, timeAgo, formatUptime } from '../../../../components/ui';
import BackupStatus from '../../../../components/BackupStatus';
import ProjectForm from '../../../../components/ProjectForm';
import TokenButton from '../../../../components/TokenButton';
import { saveProject, removeProject, addIntegration, removeIntegration, runBackupNow } from '../../../actions';

export const dynamic = 'force-dynamic';

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ backup_error?: string }>;
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { slug } = await params;
  const { backup_error: backupError } = await searchParams;
  const project = getProject(slug);
  if (!project) notFound();
  const backupRuns = listBackupRuns(slug).slice(0, 5);

  const status = getStatus(slug);
  const state = status?.state || 'unknown';
  const pm2 = status?.collector?.pm2 || [];
  const errors = (status?.collector?.errors || []).slice().reverse().slice(0, 50);
  const clientName = clientNameFor(project);

  return (
    <>
      <header className="row-wrap between">
        <div>
          <div className="muted small"><Link href="/projects">Projects</Link> / {project.slug}</div>
          <div className="row" style={{ marginTop: 4 }}>
            <h1>{project.name}</h1>
            <StateBadge state={state} />
          </div>
          <p className="muted small" style={{ marginTop: 4 }}>
            Checked {timeAgo(status?.checkedAt)} · {project.fe_url || 'No frontend URL'}
            {clientName ? (
              <>
                {' · '}
                {project.clientId ? <Link href={`/clients/${project.clientId}`}>{clientName}</Link> : clientName}
              </>
            ) : null}
          </p>
        </div>
      </header>

      <section className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 6 }}>Health checks</h2>
          <div className="check-list" style={{ marginTop: 12 }}>
            {(status?.checks || []).length === 0 ? (
              <span className="muted small">No health endpoints configured yet. Add one in Edit settings.</span>
            ) : (
              status!.checks.map((c) => (
                <div key={c.url} className="check" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
                  <span>
                    <span className={`dot ${c.ok ? 'dot-up' : 'dot-bad'}`} aria-hidden="true" />
                    {c.name} <span className="muted mono small">{c.url}</span>
                  </span>
                  <span className="mono muted">{c.ok ? `${c.status} · ${c.ms}ms` : c.error || c.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 6 }}>Server processes</h2>
          {pm2.length === 0 ? (
            <p className="muted small" style={{ marginTop: 12 }}>
              No collector data yet. Install the collector on the server to see PM2 state.
            </p>
          ) : (
            <div style={{ marginTop: 12 }}>
              {pm2.map((p) => (
                <div key={p.name} className="kv">
                  <span>
                    <span className={`dot ${p.status === 'online' ? 'dot-up' : p.status === 'errored' ? 'dot-bad' : 'dot-warn'}`} aria-hidden="true" />
                    {p.name}
                  </span>
                  <span className="mono">{p.status} · {p.restarts} restarts · up {formatUptime(p.uptimeMs)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 6 }}>Database</h2>
          {!project.database?.url_enc ? (
            <p className="muted small" style={{ marginTop: 12 }}>No connection string saved.</p>
          ) : !status?.db ? (
            <p className="muted small" style={{ marginTop: 12 }}>Checking…</p>
          ) : (
            <div className="kv" style={{ marginTop: 12 }}>
              <span>
                <span className={`dot ${status.db.ok ? 'dot-up' : 'dot-bad'}`} aria-hidden="true" />
                {project.database.type}
              </span>
              <span className="mono">
                {status.db.ok ? `Reachable · ${status.db.ms}ms` : status.db.error || 'Unreachable'}
              </span>
            </div>
          )}
          <p className="muted small" style={{ marginTop: 10 }}>Checks that the host accepts a connection, not that the login works.</p>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 6 }}>TLS certificates</h2>
          {Object.keys(status?.ssl || {}).length === 0 ? (
            <p className="muted small" style={{ marginTop: 12 }}>No https URLs to check yet.</p>
          ) : (
            <div style={{ marginTop: 12 }}>
              {Object.entries(status!.ssl).map(([host, r]) => (
                <div key={host} className="kv">
                  <span>
                    <span className={`dot ${!r.ok ? 'dot-warn' : (r.daysLeft ?? 0) <= 14 ? 'dot-warn' : 'dot-up'}`} aria-hidden="true" />
                    {host}
                  </span>
                  <span className="mono">{r.ok ? `${r.daysLeft} days left` : r.error}</span>
                </div>
              ))}
            </div>
          )}
          <p className="muted small" style={{ marginTop: 10 }}>Checked about once a day. {timeAgo(status?.sslCheckedAt)}</p>
        </div>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="row between">
          <h2>Recent errors</h2>
          <span className="muted small">{errors.length} shown</span>
        </div>
        {errors.length === 0 ? (
          <p className="muted small">No errors reported.</p>
        ) : (
          <div className="log">
            {errors.map((e, i) => (
              <div key={`${e.at}-${i}`}>
                <span className="muted">{new Date(e.at).toLocaleString()}</span>{' '}
                <span style={{ color: 'var(--down)' }}>error</span> {e.line}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="row between">
          <h2>Backups</h2>
          <form action={runBackupNow.bind(null, project.slug)}>
            <input type="hidden" name="returnTo" value={`/projects/${project.slug}`} />
            <button type="submit" className="btn btn-sm" disabled={!project.backup?.enabled || !driveConfigured()}>
              Run backup now
            </button>
          </form>
        </div>
        {backupError ? <div className="notice notice-error" role="alert">{backupError}</div> : null}
        <p className="muted small">
          {project.backup?.enabled
            ? `Scheduled ${project.backup.cron} · keeps the latest ${project.backup.retentionDays || 30} · ${project.backup.driveFolder || `Backups/${project.slug}`}`
            : 'Scheduled backups are off. Turn them on in Edit settings.'}
        </p>
        {backupRuns.length === 0 ? (
          <p className="muted small">No backups yet.</p>
        ) : (
          <div>
            {backupRuns.map((r) => (
              <div key={r.id} className="kv" style={{ alignItems: 'center' }}>
                <span className="mono small">{new Date(r.startedAt).toLocaleString()} · {r.trigger}</span>
                <span className="row" style={{ gap: 10 }}>
                  {r.bytes ? <span className="mono small muted">{Math.round(r.bytes / 1024)} KB</span> : null}
                  <BackupStatus status={r.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid-2">
        <div className="card stack" style={{ gap: 12 }}>
          <h2>Collector token</h2>
          <p className="muted small">Each server running the collector uses this project&rsquo;s token. Rotating invalidates the old one.</p>
          <TokenButton slug={project.slug} />
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <h2>Integration keys</h2>
          <p className="muted small">Encrypted. Only the last four characters are shown.</p>
          {(project.integrations || []).length === 0 ? (
            <p className="muted small">None added.</p>
          ) : (
            (project.integrations || []).map((i) => (
              <div key={i.id} className="kv" style={{ alignItems: 'center' }}>
                <span>
                  <strong style={{ color: 'var(--text)' }}>{i.label}</strong>
                  <div className="mono small muted">{i.key_name} · {maskSecret(i.value_enc)}</div>
                </span>
                <form action={removeIntegration.bind(null, project.slug, i.id)}>
                  <button type="submit" className="btn btn-sm btn-danger">Remove</button>
                </form>
              </div>
            ))
          )}
          <form action={addIntegration.bind(null, project.slug)} className="form-grid" style={{ gap: 10 }}>
            <label className="field">
              <span className="field-label">Provider</span>
              <select name="provider" defaultValue="other">
                <option value="razorpay">Razorpay</option>
                <option value="stripe">Stripe</option>
                <option value="gmail">Gmail</option>
                <option value="resend">Resend</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Label</span>
              <input type="text" name="label" placeholder="Live key" />
            </label>
            <label className="field">
              <span className="field-label">Env name</span>
              <input type="text" name="key_name" required placeholder="RAZORPAY_KEY_SECRET" className="mono" />
            </label>
            <label className="field">
              <span className="field-label">Value</span>
              <input type="password" name="value" required autoComplete="off" />
            </label>
            <div className="field field-wide" style={{ alignItems: 'flex-start' }}>
              <button type="submit" className="btn">Add key</button>
            </div>
          </form>
        </div>
      </section>

      <section className="card">
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Edit settings</summary>
          <div style={{ marginTop: 20 }}>
            <ProjectForm project={project} action={saveProject.bind(null, project.slug)} submitLabel="Save changes" />
          </div>
        </details>
      </section>

      <section className="card row between" style={{ borderColor: '#efc3bf' }}>
        <div>
          <strong>Delete project</strong>
          <p className="muted small">Removes the configuration and its status history. It does not touch the live site.</p>
        </div>
        <form action={removeProject.bind(null, project.slug)}>
          <button type="submit" className="btn btn-danger">Delete</button>
        </form>
      </section>
    </>
  );
}
