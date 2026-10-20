// Client details form. Server component; submits to a server action.
import type { Client } from '../lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ClientFormProps {
  client?: Client | null;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}

export default function ClientForm({ client, action, submitLabel = 'Save client' }: ClientFormProps) {
  const d: Partial<Client> = client || {};

  return (
    <form action={action} className="flex flex-col gap-5.5">
      <div className="grid grid-form gap-x-4.5 gap-y-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required defaultValue={d.name || ''} placeholder="Jane Doe" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" defaultValue={d.company || ''} placeholder="Optional" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          {/* text-base below md keeps iOS from zooming the page in on focus. */}
          <Input id="email" type="email" name="email" defaultValue={d.email || ''} className="font-mono text-base md:text-[13px]" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" name="phone" defaultValue={d.phone || ''} className="font-mono text-base md:text-[13px]" />
        </div>
        <div className="col-span-full flex flex-col gap-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={d.notes || ''}
            placeholder="Contract terms, preferences, how they like to be contacted…"
            className="min-h-21"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {d.updatedAt ? (
          <span className="grow min-w-0 text-sm text-muted-foreground">
            Last saved {new Date(d.updatedAt).toLocaleString()}
          </span>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
