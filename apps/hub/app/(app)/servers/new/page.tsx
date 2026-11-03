import Link from 'next/link';
import ServerForm from '../../../../components/ServerForm';
import { saveServer } from '../../../actions';

export const dynamic = 'force-dynamic';

export default function NewServerPage() {
  return (
    <>
      <header>
        <div className="text-muted-foreground text-sm">
          <Link href="/servers">Servers</Link> / New
        </div>
        <h1 className="mt-1">New server</h1>
      </header>
      <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
        <ServerForm action={saveServer.bind(null, null)} submitLabel="Create server" />
      </div>
    </>
  );
}
