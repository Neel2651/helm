import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServer, getClient } from '../../../../lib/store';
import { maskSecret } from '../../../../lib/crypto';
import ServerForm from '../../../../components/ServerForm';
import RevealValue from '../../../../components/RevealValue';
import { saveServer, removeServer } from '../../../actions';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const server = getServer(id);
  if (!server) notFound();

  const clients = (server.clientIds || []).map((cid) => getClient(cid)).filter((c) => c !== null);

  return (
    <>
      <header>
        <div className="text-muted-foreground text-sm">
          <Link href="/servers">Servers</Link> / {server.name}
        </div>
        <h1 className="mt-1">{server.name}</h1>
        {server.url ? (
          <p className="text-muted-foreground text-sm mt-1 font-mono break-all">{server.url}</p>
        ) : null}
      </header>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-3">
        <h2>Access</h2>
        <div className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm [&>span:first-child]:text-muted-foreground">
          <span>Login username</span>
          <span className="font-mono text-[13px]">{server.login_username || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm [&>span:first-child]:text-muted-foreground">
          <span>Password</span>
          {server.password_enc ? (
            <span className="flex items-center gap-1.5 font-mono text-[13px]">
              {maskSecret(server.password_enc)}
              <RevealValue endpoint={`/api/servers/${server.id}/reveal/password`} label={`${server.name} — password`} />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5 text-sm [&>span:first-child]:text-muted-foreground">
          <span>SSH key</span>
          {server.ssh_key_enc ? (
            <span className="flex items-center gap-1.5 font-mono text-[13px]">
              Saved
              <RevealValue endpoint={`/api/servers/${server.id}/reveal/ssh_key`} label={`${server.name} — SSH key`} />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-3">
        <h2>Clients</h2>
        {clients.length === 0 ? (
          <p className="text-muted-foreground text-sm">No clients tagged on this server.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {clients.map((c) => (
              <Link
                key={c!.id}
                href={`/clients/${c!.id}`}
                className="inline-block rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
              >
                {c!.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
        <ServerForm server={server} action={saveServer.bind(null, server.id)} submitLabel="Save changes" />
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex items-center gap-3 justify-between border-down-border-soft">
        <div>
          <strong>Delete server</strong>
          <p className="text-muted-foreground text-sm">Removes this server record. It does not touch the actual server.</p>
        </div>
        <form action={removeServer.bind(null, server.id)}>
          <Button type="submit" variant="destructive">
            Delete
          </Button>
        </form>
      </section>
    </>
  );
}
