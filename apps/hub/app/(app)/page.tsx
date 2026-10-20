import Link from 'next/link';
import { listProjects, getAllStatus, listAlerts } from '../../lib/store';
import { StateBadge, timeAgo } from '../../components/display';
import type { HealthState } from '../../lib/types';
import { Button } from '@/components/ui/button';

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
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1>Overview</h1>
          <p className="text-muted-foreground text-sm">Checks run every minute. Collectors push server state.</p>
        </div>
        <Button asChild><Link href="/projects/new">Add project</Link></Button>
      </header>

      <section className="grid grid-stats gap-3.5">
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <div className="text-[13px] font-semibold text-muted-foreground">Projects</div>
          <div className="mt-1 text-[28px] font-bold tracking-tight">{projects.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <div className="text-[13px] font-semibold text-muted-foreground">Up</div>
          <div className="mt-1 text-[28px] font-bold tracking-tight text-up">{counts.up}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <div className="text-[13px] font-semibold text-muted-foreground">Degraded</div>
          <div className="mt-1 text-[28px] font-bold tracking-tight text-degraded">{counts.degraded}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <div className="text-[13px] font-semibold text-muted-foreground">Down</div>
          <div className="mt-1 text-[28px] font-bold tracking-tight text-down">{counts.down}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <div className="text-[13px] font-semibold text-muted-foreground">Errors, last hour</div>
          <div className="mt-1 text-[28px] font-bold tracking-tight">{errorsLastHour}</div>
        </div>
        <Link href="/alerts" className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 text-inherit">
          <div className="text-[13px] font-semibold text-muted-foreground">Open alerts</div>
          <div className={`mt-1 text-[28px] font-bold tracking-tight ${openAlerts ? 'text-down' : 'text-foreground'}`}>{openAlerts}</div>
        </Link>
      </section>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-4 items-start">
          <h2>No projects yet</h2>
          <p className="text-muted-foreground">Add a project with its URLs and health endpoints. Checks start on the next cycle.</p>
          <Button asChild><Link href="/projects/new">Add your first project</Link></Button>
        </div>
      ) : (
        <section className="grid grid-projects gap-4">
          {projects.map((project) => {
            const status = statuses[project.slug];
            const state = status?.state || 'unknown';
            const pm2 = status?.collector?.pm2 || [];
            return (
              <Link key={project.slug} href={`/projects/${project.slug}`} className={`flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4.5 text-inherit shadow-sm hover:border-input hover:no-underline ${state === 'down' ? 'border-down-border' : 'border-border'}`}>
                <div className="flex items-center gap-3 justify-between">
                  <div>
                    <strong className="text-base">{project.name}</strong>
                    <div className="text-muted-foreground text-sm font-mono text-[13px]">{project.fe_url || project.slug}</div>
                  </div>
                  <StateBadge state={state} />
                </div>

                <div className="flex flex-col gap-1.5">
                  {(status?.checks || []).length === 0 ? (
                    <span className="text-muted-foreground text-sm">No health endpoints configured.</span>
                  ) : (
                    status.checks.map((c) => (
                      <div key={c.url} className="flex justify-between gap-2.5 text-[13px]">
                        <span>
                          <span className={`dot ${c.ok ? 'dot-up' : 'dot-bad'}`} aria-hidden="true" />
                          {c.name}
                        </span>
                        <span className="font-mono text-[13px] text-muted-foreground">
                          {c.ok ? `${c.status} · ${c.ms}ms` : c.error || `${c.status}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {pm2.length ? (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {pm2.map((p) => (
                      <span key={p.name} className="inline-block rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        <span className={`dot ${p.status === 'online' ? 'dot-up' : p.status === 'errored' ? 'dot-bad' : 'dot-warn'}`} aria-hidden="true" />
                        {p.name} · {p.status}{p.restarts ? ` · ${p.restarts} restarts` : ''}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="text-muted-foreground text-sm">Checked {timeAgo(status?.checkedAt)}</div>
              </Link>
            );
          })}
        </section>
      )}

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-3">
        <div className="flex items-center gap-3 justify-between">
          <h2>Recent errors</h2>
          <span className="text-muted-foreground text-sm">All projects</span>
        </div>
        {recentErrors.length === 0 ? (
          <p className="text-muted-foreground text-sm">No errors reported. Errors appear here once a collector is running on a server.</p>
        ) : (
          <div className="max-h-65 overflow-auto rounded-lg border border-border bg-secondary px-3 py-2.5 text-xs leading-7 whitespace-pre">
            {recentErrors.map((e, i) => (
              <div key={`${e.at}-${i}`}>
                <span className="text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span>{' '}
                <Link href={`/projects/${e.slug}`}>{e.project}</Link>{' '}
                <span className="text-down">error</span> {e.line}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
