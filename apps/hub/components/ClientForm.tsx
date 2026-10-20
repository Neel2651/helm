// Client details form. Server component; submits to a server action.
import type { Client } from '../lib/types';
import { Button } from '@/components/ui/button';

interface ClientFormProps {
  client?: Client | null;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}

export default function ClientForm({ client, action, submitLabel = 'Save client' }: ClientFormProps) {
  const d: Partial<Client> = client || {};

  return (
    <form action={action} className="form">
      <section className="flex flex-col gap-3.5">
        <div className="grid grid-form gap-x-4.5 gap-y-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Name *</span>
            <input type="text" name="name" required defaultValue={d.name || ''} placeholder="Jane Doe" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Company</span>
            <input type="text" name="company" defaultValue={d.company || ''} placeholder="Optional" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Email</span>
            <input type="text" name="email" defaultValue={d.email || ''} className="font-mono text-[13px]" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Phone</span>
            <input type="text" name="phone" defaultValue={d.phone || ''} className="font-mono text-[13px]" />
          </label>
          <label className="flex flex-col gap-1.5 col-span-full">
            <span className="text-[13px] font-semibold">Notes</span>
            <textarea name="notes" defaultValue={d.notes || ''} placeholder="Contract terms, preferences, how they like to be contacted…" />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3 justify-end">
        {d.updatedAt ? <span className="text-muted-foreground text-sm grow min-w-0">Last saved {new Date(d.updatedAt).toLocaleString()}</span> : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
