import Link from 'next/link';
import { listClients, projectsForClient } from '../../../lib/store';

export const dynamic = 'force-dynamic';

export default function ClientsPage() {
  const clients = listClients();

  return (
    <>
      <header className="row-wrap between">
        <div>
          <h1>Clients</h1>
          <p className="muted small">Link a project to a client from the project&rsquo;s General settings.</p>
        </div>
        <Link href="/clients/new" className="btn btn-primary">New client</Link>
      </header>

      {clients.length === 0 ? (
        <div className="card">
          <p className="muted">No clients yet.</p>
        </div>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Projects</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const projects = projectsForClient(c.id);
                return (
                  <tr key={c.id}>
                    <td><Link href={`/clients/${c.id}`}><strong>{c.name}</strong></Link></td>
                    <td className="muted">{c.company || '—'}</td>
                    <td className="mono muted small">{c.email || '—'}</td>
                    <td className="mono muted small">{c.phone || '—'}</td>
                    <td>
                      {projects.length === 0 ? (
                        <span className="muted small">None</span>
                      ) : (
                        <span className="row-wrap" style={{ gap: 6 }}>
                          {projects.map((p) => (
                            <Link key={p.slug} href={`/projects/${p.slug}`} className="tag">{p.name}</Link>
                          ))}
                        </span>
                      )}
                    </td>
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
