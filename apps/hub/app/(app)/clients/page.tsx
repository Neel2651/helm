import Link from 'next/link';
import { listClients, projectsForClient } from '../../../lib/store';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function ClientsPage() {
  const clients = listClients();

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1>Clients</h1>
          <p className="text-muted-foreground text-sm">Link a project to a client from the project&rsquo;s General settings.</p>
        </div>
        <Button asChild><Link href="/clients/new">New client</Link></Button>
      </header>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <p className="text-muted-foreground">No clients yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 overflow-x-auto p-0">
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
                    <td className="text-muted-foreground">{c.company || '—'}</td>
                    <td className="font-mono text-[13px] text-muted-foreground text-sm">{c.email || '—'}</td>
                    <td className="font-mono text-[13px] text-muted-foreground text-sm">{c.phone || '—'}</td>
                    <td>
                      {projects.length === 0 ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        <span className="flex flex-wrap items-center gap-1.5">
                          {projects.map((p) => (
                            <Link key={p.slug} href={`/projects/${p.slug}`} className="inline-block rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{p.name}</Link>
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
