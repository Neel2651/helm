import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getClient, projectsForClient, getStatus } from '../../../../lib/store';
import { StateBadge, timeAgo } from '../../../../components/ui';
import ClientForm from '../../../../components/ClientForm';
import { saveClient, removeClient } from '../../../actions';

export const dynamic = 'force-dynamic';

interface ClientPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function ClientPage({ params, searchParams }: ClientPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const client = getClient(id);
  if (!client) notFound();
  const projects = projectsForClient(id);

  return (
    <>
      <header>
        <div className="muted small"><Link href="/clients">Clients</Link> / {client.name}</div>
        <h1 style={{ marginTop: 4 }}>{client.name}</h1>
      </header>

      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}

      <section className="card stack" style={{ gap: 12 }}>
        <h2>Linked projects</h2>
        {projects.length === 0 ? (
          <p className="muted small">No projects linked yet. Set this client on a project&rsquo;s General settings.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Project</th><th>State</th><th>Last check</th></tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.slug}>
                    <td><Link href={`/projects/${p.slug}`}><strong>{p.name}</strong></Link></td>
                    <td><StateBadge state={getStatus(p.slug)?.state || 'unknown'} /></td>
                    <td className="muted small">{timeAgo(getStatus(p.slug)?.checkedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <ClientForm client={client} action={saveClient.bind(null, client.id)} submitLabel="Save changes" />
      </section>

      <section className="card row between" style={{ borderColor: '#efc3bf' }}>
        <div>
          <strong>Delete client</strong>
          <p className="muted small">Unlink any projects first (set their Client back to &ldquo;No client&rdquo;).</p>
        </div>
        <form action={removeClient.bind(null, client.id)}>
          <button type="submit" className="btn btn-danger" disabled={projects.length > 0}>Delete</button>
        </form>
      </section>
    </>
  );
}
