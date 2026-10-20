import Link from 'next/link';
import ClientForm from '../../../../components/ClientForm';
import { saveClient } from '../../../actions';

export const dynamic = 'force-dynamic';

export default function NewClientPage() {
  return (
    <>
      <header>
        <div className="text-muted-foreground text-sm"><Link href="/clients">Clients</Link> / New</div>
        <h1 className="mt-1">New client</h1>
      </header>
      <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
        <ClientForm action={saveClient.bind(null, null)} submitLabel="Create client" />
      </div>
    </>
  );
}
