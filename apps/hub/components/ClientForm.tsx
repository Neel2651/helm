// Client details form. Server component; submits to a server action.
import type { Client } from '../lib/types';

interface ClientFormProps {
  client?: Client | null;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}

export default function ClientForm({ client, action, submitLabel = 'Save client' }: ClientFormProps) {
  const d: Partial<Client> = client || {};

  return (
    <form action={action} className="form">
      <section className="form-section">
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Name *</span>
            <input type="text" name="name" required defaultValue={d.name || ''} placeholder="Jane Doe" />
          </label>
          <label className="field">
            <span className="field-label">Company</span>
            <input type="text" name="company" defaultValue={d.company || ''} placeholder="Optional" />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input type="text" name="email" defaultValue={d.email || ''} className="mono" />
          </label>
          <label className="field">
            <span className="field-label">Phone</span>
            <input type="text" name="phone" defaultValue={d.phone || ''} className="mono" />
          </label>
          <label className="field field-wide">
            <span className="field-label">Notes</span>
            <textarea name="notes" defaultValue={d.notes || ''} placeholder="Contract terms, preferences, how they like to be contacted…" />
          </label>
        </div>
      </section>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {d.updatedAt ? <span className="muted small grow">Last saved {new Date(d.updatedAt).toLocaleString()}</span> : null}
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
