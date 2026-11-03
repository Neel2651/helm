import Link from 'next/link';
import { listServers, getClient } from '../../../lib/store';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

function renewalLabel(iso: string): { text: string; soon: boolean } {
  if (!iso) return { text: '—', soon: false };
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return { text: iso, soon: false };
  if (days < 0) return { text: `${new Date(iso).toLocaleDateString()} (overdue)`, soon: true };
  return { text: `${new Date(iso).toLocaleDateString()} (${days}d)`, soon: days <= 14 };
}

export default function ServersPage() {
  const servers = listServers();

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1>Servers</h1>
          <p className="text-muted-foreground text-sm">Purchased servers, their access details and renewals.</p>
        </div>
        <Button asChild>
          <Link href="/servers/new">New server</Link>
        </Button>
      </header>

      {servers.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <p className="text-muted-foreground">No servers yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 overflow-x-auto p-0">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Provider</th>
                <th>Clients</th>
                <th>Renewal</th>
                <th>OS</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s) => {
                const renewal = renewalLabel(s.renewalDate);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/servers/${s.id}`}>
                        <strong>{s.name}</strong>
                      </Link>
                    </td>
                    <td className="text-muted-foreground">{s.provider || '—'}</td>
                    <td>
                      {(s.clientIds || []).length === 0 ? (
                        <span className="text-muted-foreground text-sm">None</span>
                      ) : (
                        <span className="flex flex-wrap items-center gap-1.5">
                          {s.clientIds.map((id) => {
                            const c = getClient(id);
                            return c ? (
                              <Link
                                key={id}
                                href={`/clients/${id}`}
                                className="inline-block rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {c.name}
                              </Link>
                            ) : null;
                          })}
                        </span>
                      )}
                    </td>
                    <td className={`text-sm ${renewal.soon ? 'text-down' : 'text-muted-foreground'}`}>{renewal.text}</td>
                    <td className="text-muted-foreground text-sm">{s.os || '—'}</td>
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
