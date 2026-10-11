import Link from 'next/link';
import ClientForm from '../../../../components/ClientForm';
import { saveClient } from '../../../actions';

export const dynamic = 'force-dynamic';

export default function NewClientPage() {
  return (
    <>
      <header>
        <div className="muted small"><Link href="/clients">Clients</Link> / New</div>
        <h1 style={{ marginTop: 4 }}>New client</h1>
      </header>
      <div className="card">
        <ClientForm action={saveClient.bind(null, null)} submitLabel="Create client" />
      </div>
    </>
  );
}
