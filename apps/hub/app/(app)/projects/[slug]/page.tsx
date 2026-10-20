import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, getStatus, listBackupRuns, clientNameFor } from '../../../../lib/store';
import { maskSecret } from '../../../../lib/crypto';
import { driveConfigured } from '../../../../lib/drive';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StateBadge, timeAgo, formatUptime } from '../../../../components/display';
import BackupStatus from '../../../../components/BackupStatus';
import ProjectForm from '../../../../components/ProjectForm';
import TokenButton from '../../../../components/TokenButton';
import { saveProject, removeProject, addIntegration, removeIntegration, runBackupNow } from '../../../actions';

export const dynamic = 'force-dynamic';

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ backup_error?: string }>;
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { slug } = await params;
  const { backup_error: backupError } = await searchParams;
  const project = getProject(slug);
  if (!project) notFound();
  const backupRuns = listBackupRuns(slug).slice(0, 5);

  const status = getStatus(slug);
  const state = status?.state || 'unknown';
  const pm2 = status?.collector?.pm2 || [];
  const errors = (status?.collector?.errors || []).slice().reverse().slice(0, 50);
  const clientName = clientNameFor(project);

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="text-muted-foreground text-sm"><Link href="/projects">Projects</Link> / {project.slug}</div>
          <div className="flex items-center gap-3 mt-1">
            <h1>{project.name}</h1>
            <StateBadge state={state} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Checked {timeAgo(status?.checkedAt)} · {project.fe_url || 'No frontend URL'}
            {clientName ? (
              <>
                {' · '}
                {project.clientId ? <Link href={`/clients/${project.clientId}`}>{clientName}</Link> : clientName}
              </>
            ) : null}
          </p>
        </div>
      </header>

      <section className="grid grid-panels gap-4">
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <h2 className="mb-1.5">Health checks</h2>
          <div className="flex flex-col gap-1.5 mt-3">
            {(status?.checks || []).length === 0 ? (
              <span className="text-muted-foreground text-sm">No health endpoints configured yet. Add one in Edit settings.</span>
            ) : (
              status!.checks.map((c) => (
                <div key={c.url} className="flex justify-between gap-2.5 text-[13px] border-b border-dashed border-border py-1.5">
                  <span>
                    <span className={`dot ${c.ok ? 'dot-up' : 'dot-bad'}`} aria-hidden="true" />
                    {c.name} <span className="text-muted-foreground font-mono text-[13px] text-sm">{c.url}</span>
                  </span>
                  <span className="font-mono text-[13px] text-muted-foreground">{c.ok ? `${c.status} · ${c.ms}ms` : c.error || c.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <h2 className="mb-1.5">Server processes</h2>
          {pm2.length === 0 ? (
            <p className="text-muted-foreground text-sm mt-3">
              No collector data yet. Install the collector on the server to see PM2 state.
            </p>
          ) : (
            <div className="mt-3">
              {pm2.map((p) => (
                <div key={p.name} className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground">
                  <span>
                    <span className={`dot ${p.status === 'online' ? 'dot-up' : p.status === 'errored' ? 'dot-bad' : 'dot-warn'}`} aria-hidden="true" />
                    {p.name}
                  </span>
                  <span className="font-mono text-[13px]">{p.status} · {p.restarts} restarts · up {formatUptime(p.uptimeMs)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-panels gap-4">
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <h2 className="mb-1.5">Database</h2>
          {!project.database?.url_enc ? (
            <p className="text-muted-foreground text-sm mt-3">No connection string saved.</p>
          ) : !status?.db ? (
            <p className="text-muted-foreground text-sm mt-3">Checking…</p>
          ) : (
            <div className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground mt-3">
              <span>
                <span className={`dot ${status.db.ok ? 'dot-up' : 'dot-bad'}`} aria-hidden="true" />
                {project.database.type}
              </span>
              <span className="font-mono text-[13px]">
                {status.db.ok ? `Reachable · ${status.db.ms}ms` : status.db.error || 'Unreachable'}
              </span>
            </div>
          )}
          <p className="text-muted-foreground text-sm mt-2.5">Checks that the host accepts a connection, not that the login works.</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0">
          <h2 className="mb-1.5">TLS certificates</h2>
          {Object.keys(status?.ssl || {}).length === 0 ? (
            <p className="text-muted-foreground text-sm mt-3">No https URLs to check yet.</p>
          ) : (
            <div className="mt-3">
              {Object.entries(status!.ssl).map(([host, r]) => (
                <div key={host} className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground">
                  <span>
                    <span className={`dot ${!r.ok ? 'dot-warn' : (r.daysLeft ?? 0) <= 14 ? 'dot-warn' : 'dot-up'}`} aria-hidden="true" />
                    {host}
                  </span>
                  <span className="font-mono text-[13px]">{r.ok ? `${r.daysLeft} days left` : r.error}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-muted-foreground text-sm mt-2.5">Checked about once a day. {timeAgo(status?.sslCheckedAt)}</p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-4 gap-3">
        <div className="flex items-center gap-3 justify-between">
          <h2>Recent errors</h2>
          <span className="text-muted-foreground text-sm">{errors.length} shown</span>
        </div>
        {errors.length === 0 ? (
          <p className="text-muted-foreground text-sm">No errors reported.</p>
        ) : (
          <div className="max-h-65 overflow-auto rounded-lg border border-border bg-secondary px-3 py-2.5 text-xs leading-7 whitespace-pre">
            {errors.map((e, i) => (
              <div key={`${e.at}-${i}`}>
                <span className="text-muted-foreground">{new Date(e.at).toLocaleString()}</span>{' '}
                <span className="text-down">error</span> {e.line}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-4 gap-3">
        <div className="flex items-center gap-3 justify-between">
          <h2>Backups</h2>
          <form action={runBackupNow.bind(null, project.slug)}>
            <input type="hidden" name="returnTo" value={`/projects/${project.slug}`} />
            <Button type="submit" variant="outline" size="sm" disabled={!project.backup?.enabled || !driveConfigured()}>
              Run backup now
            </Button>
          </form>
        </div>
        {backupError ? <div className="rounded-lg border border-degraded-border bg-degraded-soft px-3.5 py-3 text-sm text-degraded border-down-border-soft bg-down-soft text-down" role="alert">{backupError}</div> : null}
        <p className="text-muted-foreground text-sm">
          {project.backup?.enabled
            ? `Scheduled ${project.backup.cron} · keeps the latest ${project.backup.retentionDays || 30} · ${project.backup.driveFolder || `Backups/${project.slug}`}`
            : 'Scheduled backups are off. Turn them on in Edit settings.'}
        </p>
        {backupRuns.length === 0 ? (
          <p className="text-muted-foreground text-sm">No backups yet.</p>
        ) : (
          <div>
            {backupRuns.map((r) => (
              <div key={r.id} className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground items-center">
                <span className="font-mono text-[13px] text-sm">{new Date(r.startedAt).toLocaleString()} · {r.trigger}</span>
                <span className="flex items-center gap-3 gap-2.5">
                  {r.bytes ? <span className="font-mono text-[13px] text-sm text-muted-foreground">{Math.round(r.bytes / 1024)} KB</span> : null}
                  <BackupStatus status={r.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-panels gap-4">
        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-4 gap-3">
          <h2>Collector token</h2>
          <p className="text-muted-foreground text-sm">Each server running the collector uses this project&rsquo;s token. Rotating invalidates the old one.</p>
          <TokenButton slug={project.slug} />
        </div>

        <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-4 gap-3">
          <h2>Integration keys</h2>
          <p className="text-muted-foreground text-sm">Encrypted. Only the last four characters are shown.</p>
          {(project.integrations || []).length === 0 ? (
            <p className="text-muted-foreground text-sm">None added.</p>
          ) : (
            (project.integrations || []).map((i) => (
              <div key={i.id} className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground items-center">
                <span>
                  <strong className="text-foreground">{i.label}</strong>
                  <div className="font-mono text-[13px] text-sm text-muted-foreground">{i.key_name} · {maskSecret(i.value_enc)}</div>
                </span>
                <form action={removeIntegration.bind(null, project.slug, i.id)}>
                  <Button type="submit" variant="destructive" size="sm">Remove</Button>
                </form>
              </div>
            ))
          )}
          <form action={addIntegration.bind(null, project.slug)} className="grid grid-form gap-2.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="provider">Provider</Label>
              <Select name="provider" defaultValue="other">
                <SelectTrigger id="provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration_label">Label</Label>
              <Input id="integration_label" name="label" placeholder="Live key" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="key_name">Env name</Label>
              <Input id="key_name" name="key_name" required placeholder="RAZORPAY_KEY_SECRET" className="font-mono text-[13px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="integration_value">Value</Label>
              <Input id="integration_value" type="password" name="value" required autoComplete="off" />
            </div>
            <div className="col-span-full flex items-start">
              <Button type="submit" variant="outline">Add key</Button>
            </div>
          </form>
        </div>
      </section>

      <Card className="p-4.5">
        <Collapsible>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between font-bold">
            Edit settings
            <ChevronDownIcon className="size-4 transition-transform data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-5">
            <ProjectForm project={project} action={saveProject.bind(null, project.slug)} submitLabel="Save changes" />
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex items-center gap-3 justify-between border-down-border-soft">
        <div>
          <strong>Delete project</strong>
          <p className="text-muted-foreground text-sm">Removes the configuration and its status history. It does not touch the live site.</p>
        </div>
        <form action={removeProject.bind(null, project.slug)}>
          <Button type="submit" variant="destructive">Delete</Button>
        </form>
      </section>
    </>
  );
}
