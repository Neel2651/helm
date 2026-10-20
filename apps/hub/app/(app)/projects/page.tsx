import Link from 'next/link';
import { listProjects, getAllStatus, clientNameFor } from '../../../lib/store';
import { StateBadge, timeAgo } from '../../../components/display';
import { Button } from '@/components/ui/button';
import Truncate from '@/components/Truncate';

export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  const projects = listProjects();
  const statuses = getAllStatus();

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1>Projects</h1>
          <p className="text-muted-foreground text-sm">Configuration for every project Helm watches.</p>
        </div>
        <Button asChild><Link href="/projects/new">New project</Link></Button>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <p className="text-muted-foreground">No projects yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 overflow-x-auto p-0">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>State</th>
                <th>Frontend</th>
                <th>Server</th>
                <th>Backups</th>
                <th>Last check</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const s = statuses[p.slug];
                const clientName = clientNameFor(p);
                return (
                  <tr key={p.slug}>
                    <td>
                      <Link href={`/projects/${p.slug}`}><strong>{p.name}</strong></Link>
                      {clientName ? (
                        p.clientId ? (
                          <div className="text-muted-foreground text-sm"><Link href={`/clients/${p.clientId}`}>{clientName}</Link></div>
                        ) : (
                          <div className="text-muted-foreground text-sm">{clientName}</div>
                        )
                      ) : null}
                    </td>
                    <td><StateBadge state={s?.state || 'unknown'} /></td>
                    <td className="font-mono text-[13px] text-muted-foreground">{p.fe_url || '—'}</td>
                    <td className="font-mono text-[13px] text-muted-foreground">
                      <div className="max-w-48">
                        <Truncate>{p.server_host || '—'}</Truncate>
                      </div>
                    </td>
                    <td>{p.backup?.enabled ? <span className="inline-block rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{p.backup.cron}</span> : <span className="text-muted-foreground text-sm">Off</span>}</td>
                    <td className="text-muted-foreground text-sm">{timeAgo(s?.checkedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
