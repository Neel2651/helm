import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getClient, projectsForClient, getStatus } from '../../../../lib/store';
import { StateBadge, timeAgo } from '../../../../components/display';
import ClientForm from '../../../../components/ClientForm';
import { saveClient, removeClient } from '../../../actions';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

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
        <div className="text-muted-foreground text-sm"><Link href="/clients">Clients</Link> / {client.name}</div>
        <h1 className="mt-1">{client.name}</h1>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-3">
        <h2>Linked projects</h2>
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">No projects linked yet. Set this client on a project&rsquo;s General settings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Project</th><th>State</th><th>Last check</th></tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.slug}>
                    <td><Link href={`/projects/${p.slug}`}><strong>{p.name}</strong></Link></td>
                    <td><StateBadge state={getStatus(p.slug)?.state || 'unknown'} /></td>
                    <td className="text-muted-foreground text-sm">{timeAgo(getStatus(p.slug)?.checkedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
        <ClientForm client={client} action={saveClient.bind(null, client.id)} submitLabel="Save changes" />
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex items-center gap-3 justify-between border-down-border-soft">
        <div>
          <strong>Delete client</strong>
          <p className="text-muted-foreground text-sm">Unlink any projects first (set their Client back to &ldquo;No client&rdquo;).</p>
        </div>
        <form action={removeClient.bind(null, client.id)}>
          <Button type="submit" variant="destructive" disabled={projects.length > 0}>Delete</Button>
        </form>
      </section>
    </>
  );
}
