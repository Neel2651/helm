// Server details form. Server component; submits to a server action.
// Secret fields (password, SSH key) are never prefilled — a blank field keeps the stored value,
// the same idiom as the project database password.
import { listClients } from '../lib/store';
import type { Server } from '../lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5 border-b border-border pb-2">
        <h2 className="text-base font-bold">{title}</h2>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </div>
      <div className="grid grid-form gap-x-4.5 gap-y-3.5">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  wide,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'col-span-full' : ''}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

interface ServerFormProps {
  server?: Server | null;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}

export default function ServerForm({ server, action, submitLabel = 'Save server' }: ServerFormProps) {
  const isEdit = Boolean(server);
  const d: Partial<Server> = server || {};
  const clients = listClients();
  const linked = new Set(d.clientIds || []);

  return (
    <form action={action} className="flex flex-col gap-5.5">
      <Section title="General" hint="What this server is and who it is for.">
        <Field label="Name *" htmlFor="name">
          <Input id="name" name="name" required defaultValue={d.name || ''} placeholder="vps-1 (Hetzner CX22)" />
        </Field>
        <Field label="Hosting provider" htmlFor="provider">
          <Input id="provider" name="provider" defaultValue={d.provider || ''} placeholder="Hetzner" />
        </Field>
        <Field label="Server / panel URL" htmlFor="url" wide hint="Reference only — Helm does not connect to it.">
          <Input id="url" type="url" name="url" defaultValue={d.url || ''} placeholder="https://console.hetzner.cloud/…" className="font-mono text-base md:text-[13px]" />
        </Field>
        <div className="col-span-full flex flex-col gap-2">
          <Label>Clients</Label>
          {clients.length === 0 ? (
            <span className="text-sm text-muted-foreground">No clients yet. Add clients first to tag this server.</span>
          ) : (
            <div className="grid grid-form gap-x-4.5 gap-y-2">
              {clients.map((c) => (
                <label key={c.id} htmlFor={`client_${c.id}`} className="flex items-center gap-2.5 text-sm">
                  <Checkbox id={`client_${c.id}`} name="client_ids" value={c.id} defaultChecked={linked.has(c.id)} />
                  {c.name}
                  {c.company ? <span className="text-muted-foreground">({c.company})</span> : null}
                </label>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Section title="Access" hint="Credentials are encrypted at rest. Leave a secret blank to keep the saved value.">
        <Field label="Login username" htmlFor="login_username">
          <Input id="login_username" name="login_username" defaultValue={d.login_username || ''} placeholder="root" className="font-mono text-base md:text-[13px]" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" name="password" autoComplete="new-password" placeholder={d.password_enc ? 'Saved. Leave blank to keep.' : ''} />
        </Field>
        <Field label="SSH key" htmlFor="ssh_key" wide hint={d.ssh_key_enc ? 'Saved. Leave blank to keep.' : 'Private key or public key, whichever you need on hand.'}>
          <Textarea id="ssh_key" name="ssh_key" placeholder={d.ssh_key_enc ? '•••••••• saved — leave blank to keep' : '-----BEGIN OPENSSH PRIVATE KEY-----'} className="min-h-21 font-mono text-[13px]" />
        </Field>
      </Section>

      <Section title="Hardware" hint="For your own reference.">
        <Field label="OS" htmlFor="os">
          <Input id="os" name="os" defaultValue={d.os || ''} placeholder="Ubuntu 24.04" />
        </Field>
        <Field label="Processor" htmlFor="processor">
          <Input id="processor" name="processor" defaultValue={d.processor || ''} placeholder="2 vCPU" />
        </Field>
        <Field label="RAM" htmlFor="ram">
          <Input id="ram" name="ram" defaultValue={d.ram || ''} placeholder="4 GB" />
        </Field>
        <Field label="Storage" htmlFor="storage">
          <Input id="storage" name="storage" defaultValue={d.storage || ''} placeholder="80 GB SSD" />
        </Field>
      </Section>

      <Section title="Renewal" hint="When the server is next due and what it costs.">
        <Field label="Renewal date" htmlFor="renewalDate">
          <Input id="renewalDate" type="date" name="renewalDate" defaultValue={d.renewalDate || ''} />
        </Field>
        <Field label="Cost" htmlFor="cost">
          <Input id="cost" name="cost" defaultValue={d.cost || ''} placeholder="$6/mo" />
        </Field>
      </Section>

      <Section title="Notes" hint="Anything else worth keeping with this server.">
        <Field label="Notes" htmlFor="notes" wide>
          <Textarea id="notes" name="notes" defaultValue={d.notes || ''} placeholder="Firewall rules, mounted volumes, who set it up…" className="min-h-21" />
        </Field>
      </Section>

      <div className="flex items-center justify-end gap-3">
        {isEdit ? (
          <span className="grow min-w-0 text-sm text-muted-foreground">
            Last saved {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '—'}
          </span>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
