import Link from 'next/link';
import { listProjects, getAllStatus, clientNameFor } from '../../../lib/store';
import { StateBadge, timeAgo } from '../../../components/ui';

export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  const projects = listProjects();
  const statuses = getAllStatus();

  return (
    <>
      <header className="row-wrap between">
        <div>
          <h1>Projects</h1>
          <p className="muted small">Configuration for every project Helm watches.</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">New project</Link>
      </header>

      {projects.length === 0 ? (
        <div className="card">
          <p className="muted">No projects yet.</p>
        </div>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
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
                          <div className="muted small"><Link href={`/clients/${p.clientId}`}>{clientName}</Link></div>
                        ) : (
                          <div className="muted small">{clientName}</div>
                        )
                      ) : null}
                    </td>
                    <td><StateBadge state={s?.state || 'unknown'} /></td>
                    <td className="mono muted">{p.fe_url || '—'}</td>
                    <td className="mono muted">{p.server_host || '—'}</td>
                    <td>{p.backup?.enabled ? <span className="tag">{p.backup.cron}</span> : <span className="muted small">Off</span>}</td>
                    <td className="muted small">{timeAgo(s?.checkedAt)}</td>
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
