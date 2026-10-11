import Link from 'next/link';
import { listProjects, getAllStatus, listAlerts } from '../../lib/store';
import { StateBadge, timeAgo } from '../../components/ui';
import type { HealthState } from '../../lib/types';

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  const projects = listProjects();
  const statuses = getAllStatus();
  const openAlerts = listAlerts().filter((a) => !a.resolvedAt).length;

  const counts: Record<HealthState, number> = { up: 0, degraded: 0, down: 0, unknown: 0 };
  let errorsLastHour = 0;
  const cutoff = Date.now() - 60 * 60 * 1000;

  for (const project of projects) {
    counts[statuses[project.slug]?.state || 'unknown'] += 1;
    for (const e of statuses[project.slug]?.collector?.errors || []) {
      if (new Date(e.at).getTime() >= cutoff) errorsLastHour += 1;
    }
  }

  const recentErrors = projects
    .flatMap((p) =>
      (statuses[p.slug]?.collector?.errors || []).map((e) => ({ ...e, project: p.name, slug: p.slug })),
    )
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <>
      <header className="row-wrap between">
        <div>
          <h1>Overview</h1>
          <p className="muted small">Checks run every minute. Collectors push server state.</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">Add project</Link>
      </header>

      <section className="grid-stats">
        <div className="card">
          <div className="stat-label">Projects</div>
          <div className="stat-value">{projects.length}</div>
        </div>
        <div className="card">
          <div className="stat-label">Up</div>
          <div className="stat-value" style={{ color: 'var(--up)' }}>{counts.up}</div>
        </div>
        <div className="card">
          <div className="stat-label">Degraded</div>
          <div className="stat-value" style={{ color: 'var(--degraded)' }}>{counts.degraded}</div>
        </div>
        <div className="card">
          <div className="stat-label">Down</div>
          <div className="stat-value" style={{ color: 'var(--down)' }}>{counts.down}</div>
        </div>
        <div className="card">
          <div className="stat-label">Errors, last hour</div>
          <div className="stat-value">{errorsLastHour}</div>
        </div>
        <Link href="/alerts" className="card" style={{ color: 'inherit' }}>
          <div className="stat-label">Open alerts</div>
          <div className="stat-value" style={{ color: openAlerts ? 'var(--down)' : 'var(--text)' }}>{openAlerts}</div>
        </Link>
      </section>

      {projects.length === 0 ? (
        <div className="card stack" style={{ alignItems: 'flex-start' }}>
          <h2>No projects yet</h2>
          <p className="muted">Add a project with its URLs and health endpoints. Checks start on the next cycle.</p>
          <Link href="/projects/new" className="btn btn-primary">Add your first project</Link>
        </div>
      ) : (
        <section className="grid-projects">
          {projects.map((project) => {
            const status = statuses[project.slug];
            const state = status?.state || 'unknown';
            const pm2 = status?.collector?.pm2 || [];
            return (
              <Link key={project.slug} href={`/projects/${project.slug}`} className={`card project-card ${state === 'down' ? 'is-down' : ''}`}>
                <div className="row between">
                  <div>
                    <strong style={{ fontSize: 16 }}>{project.name}</strong>
                    <div className="muted small mono">{project.fe_url || project.slug}</div>
                  </div>
                  <StateBadge state={state} />
                </div>

                <div className="check-list">
                  {(status?.checks || []).length === 0 ? (
                    <span className="muted small">No health endpoints configured.</span>
                  ) : (
                    status.checks.map((c) => (
                      <div key={c.url} className="check">
                        <span>
                          <span className={`dot ${c.ok ? 'dot-up' : 'dot-bad'}`} aria-hidden="true" />
                          {c.name}
                        </span>
                        <span className="mono muted">
                          {c.ok ? `${c.status} · ${c.ms}ms` : c.error || `${c.status}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {pm2.length ? (
                  <div className="row-wrap small">
                    {pm2.map((p) => (
                      <span key={p.name} className="tag">
                        <span className={`dot ${p.status === 'online' ? 'dot-up' : p.status === 'errored' ? 'dot-bad' : 'dot-warn'}`} aria-hidden="true" />
                        {p.name} · {p.status}{p.restarts ? ` · ${p.restarts} restarts` : ''}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="muted small">Checked {timeAgo(status?.checkedAt)}</div>
              </Link>
            );
          })}
        </section>
      )}

      <section className="card stack" style={{ gap: 12 }}>
        <div className="row between">
          <h2>Recent errors</h2>
          <span className="muted small">All projects</span>
        </div>
        {recentErrors.length === 0 ? (
          <p className="muted small">No errors reported. Errors appear here once a collector is running on a server.</p>
        ) : (
          <div className="log">
            {recentErrors.map((e, i) => (
              <div key={`${e.at}-${i}`}>
                <span className="muted">{new Date(e.at).toLocaleTimeString()}</span>{' '}
                <Link href={`/projects/${e.slug}`}>{e.project}</Link>{' '}
                <span style={{ color: 'var(--down)' }}>error</span> {e.line}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
