// Project settings form. Server component; submits to a server action.
// Secret fields are never prefilled. A blank secret keeps the stored value.
//
// The Select and Checkbox below are Radix-backed client components, but this file stays a
// server component: it reads the store directly, and Radix renders a hidden native control
// inside the form, so every field still arrives in FormData exactly as before.
import Link from 'next/link';
import { listClients } from '../lib/store';
import type { Project } from '../lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

function healthText(project: Partial<Project>): string {
  return (project?.health_endpoints || []).map((e) => `${e.name} | ${e.url} | ${e.expectStatus || 200}`).join('\n');
}

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

interface ProjectFormProps {
  project?: Project | null;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}

export default function ProjectForm({ project, action, submitLabel = 'Save project' }: ProjectFormProps) {
  const isEdit = Boolean(project);
  const d: Partial<Project> = project || {};
  const db = d.database || ({} as Partial<Project['database']>);
  const backup = d.backup || ({} as Partial<Project['backup']>);
  const git = d.git || ({} as Partial<Project['git']>);

  return (
    <form action={action} className="flex flex-col gap-5.5">
      <Section title="General" hint="What this project is called and who it is for.">
        <Field label="Project name *" htmlFor="name">
          <Input id="name" name="name" required defaultValue={d.name || ''} placeholder="CodeDharma Web" />
        </Field>
        <Field label="Slug" htmlFor="slug" hint="Used in URLs. Lowercase letters, numbers and dashes.">
          <Input id="slug" name="slug" defaultValue={d.slug || ''} placeholder="generated from name" className="font-mono text-[13px]" />
        </Field>
        <Field label="Client" htmlFor="client_id" hint={<Link href="/clients/new">+ New client</Link>}>
          {/* Radix rejects an empty SelectItem value, so "none" stands in for "no client"
              and app/actions.ts maps it back to null. */}
          <Select name="client_id" defaultValue={d.clientId || 'none'}>
            <SelectTrigger id="client_id" className="w-full">
              <SelectValue placeholder="No client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client</SelectItem>
              {listClients().map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` (${c.company})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select name="status" defaultValue={d.status || 'active'}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section
        title="URLs and health"
        hint="Helm checks the health endpoints every minute. The frontend and backend URLs are saved for reference only."
      >
        <Field label="Frontend URL" htmlFor="fe_url" hint="Stored only, not checked">
          <Input id="fe_url" type="url" name="fe_url" defaultValue={d.fe_url || ''} placeholder="https://www.example.com" className="font-mono text-[13px]" />
        </Field>
        <Field label="Backend URL" htmlFor="be_url" hint="Stored only, not checked">
          <Input id="be_url" type="url" name="be_url" defaultValue={d.be_url || ''} placeholder="https://api.example.com" className="font-mono text-[13px]" />
        </Field>
        <Field
          label="Health endpoints (checked)"
          htmlFor="health"
          wide
          hint={
            <>
              One per line: name | url | expected status (default 200). A backend is &ldquo;up&rdquo; when its health
              endpoint returns the expected status.
            </>
          }
        >
          <Textarea id="health" name="health" defaultValue={healthText(d)} placeholder={'Backend | https://api.example.com/health | 200'} className="min-h-21 font-mono text-[13px]" />
        </Field>
      </Section>

      <Section title="Server and PM2" hint="Used by the collector and the deploy checks.">
        <Field label="Server host" htmlFor="server_host">
          <Input id="server_host" name="server_host" defaultValue={d.server_host || ''} placeholder="vps-1.example.com" className="font-mono text-[13px]" />
        </Field>
        <Field label="PM2 process names" htmlFor="pm2" hint="Comma-separated">
          <Input id="pm2" name="pm2" defaultValue={(d.pm2_process_names || []).join(', ')} placeholder="fifthcusp-api, fifthcusp-web" className="font-mono text-[13px]" />
        </Field>
        <Field label="Log file paths" htmlFor="logs" wide hint="Comma-separated. The collector scans these for errors.">
          <Input id="logs" name="logs" defaultValue={(d.log_paths || []).join(', ')} placeholder="/var/www/app/logs/error.log" className="font-mono text-[13px]" />
        </Field>
      </Section>

      <Section title="Git" hint="Repository this project deploys from.">
        <Field label="Repository URL" htmlFor="git_repo">
          <Input id="git_repo" name="git_repo" defaultValue={git.repo || ''} placeholder="git@github.com:you/app.git" className="font-mono text-[13px]" />
        </Field>
        <Field label="Branch" htmlFor="git_branch">
          <Input id="git_branch" name="git_branch" defaultValue={git.branch || 'main'} className="font-mono text-[13px]" />
        </Field>
      </Section>

      <Section title="Database" hint="Credentials are encrypted at rest. Use a read-only user for monitoring.">
        <Field label="Type" htmlFor="db_type">
          <Select name="db_type" defaultValue={db.type || 'mongodb'}>
            <SelectTrigger id="db_type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mongodb">MongoDB</SelectItem>
              <SelectItem value="postgres">Postgres</SelectItem>
              <SelectItem value="mysql">MySQL</SelectItem>
              <SelectItem value="sqlite">SQLite</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="User" htmlFor="db_user">
          <Input id="db_user" name="db_user" defaultValue={db.user || ''} placeholder="ops_readonly" className="font-mono text-[13px]" />
        </Field>
        <Field label="Connection string" htmlFor="db_url" wide>
          <Input id="db_url" type="password" name="db_url" autoComplete="off" placeholder={db.url_enc ? 'Saved. Leave blank to keep.' : 'mongodb+srv://…'} className="font-mono text-[13px]" />
        </Field>
        <Field label="Password" htmlFor="db_password">
          <Input id="db_password" type="password" name="db_password" autoComplete="new-password" placeholder={db.password_enc ? 'Saved. Leave blank to keep.' : ''} />
        </Field>
        <Field label="Collections or tables" htmlFor="collections" hint="Comma-separated">
          <Input id="collections" name="collections" defaultValue={(db.collections || []).join(', ')} placeholder="contacts, bookings" className="font-mono text-[13px]" />
        </Field>
      </Section>

      <Section title="Backups" hint="Dump, zip and upload to Google Drive on this schedule.">
        <div className="col-span-full flex items-center gap-2.5">
          <Checkbox id="backup_enabled" name="backup_enabled" defaultChecked={backup.enabled ?? false} />
          <Label htmlFor="backup_enabled" className="font-semibold">
            Backups enabled
          </Label>
        </div>
        <Field label="Schedule (cron)" htmlFor="backup_cron">
          <Input id="backup_cron" name="backup_cron" defaultValue={backup.cron || '0 2 * * *'} className="font-mono text-[13px]" />
        </Field>
        <Field
          label="Keep latest backups"
          htmlFor="backup_retention"
          hint="One backup per run. With a daily schedule, this is the number of days kept."
        >
          <Input id="backup_retention" type="number" min="1" name="backup_retention" defaultValue={backup.retentionDays || 30} />
        </Field>
        <Field label="Google Drive folder" htmlFor="backup_drive_folder" wide>
          <Input id="backup_drive_folder" name="backup_drive_folder" defaultValue={backup.driveFolder || ''} placeholder="Backups/codedharma-web" className="font-mono text-[13px]" />
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
