import Link from 'next/link';
import { listAlerts, listProjects } from '../../../lib/store';
import { telegramConfigured } from '../../../lib/notify';
import { sendTestAlert } from '../../actions';
import { timeAgo } from '../../../components/display';
import type { AlertSeverity } from '../../../lib/types';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const SEVERITY_COLOR: Record<AlertSeverity, string> = { critical: 'text-down', warning: 'text-degraded' };

interface AlertsPageProps {
  searchParams: Promise<{ test?: string }>;
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const { test } = await searchParams;
  const alerts = listAlerts();
  const names = Object.fromEntries(listProjects().map((p) => [p.slug, p.name]));
  const open = alerts.filter((a) => !a.resolvedAt);
  const history = alerts.slice(0, 50);

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1>Alerts</h1>
          <p className="text-muted-foreground text-sm">Sent once when a problem starts and once when it clears.</p>
        </div>
      </header>

      {!telegramConfigured() ? (
        <div className="rounded-lg border border-degraded-border bg-degraded-soft px-3.5 py-3 text-sm text-degraded">
          Telegram is not connected, so alerts are only written to the hub log. Set HELM_TELEGRAM_BOT_TOKEN and HELM_TELEGRAM_CHAT_ID, then restart the hub.
        </div>
      ) : null}

      {test === 'ok' ? <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 border-accent-border">Test message sent to Telegram.</div> : null}
      {test && test !== 'ok' ? <div className="rounded-lg border border-degraded-border bg-degraded-soft px-3.5 py-3 text-sm text-degraded border-down-border-soft bg-down-soft text-down" role="alert">Test failed: {test}</div> : null}

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <strong>Telegram</strong>
          <p className="text-muted-foreground text-sm">
            {telegramConfigured() ? 'Connected. Send a test message to confirm.' : 'Not connected.'}
          </p>
        </div>
        <form action={sendTestAlert}>
          <Button type="submit" variant="outline" disabled={!telegramConfigured()}>Send test message</Button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-4 gap-3">
        <div className="flex items-center gap-3 justify-between">
          <h2>Open now</h2>
          <span className="text-muted-foreground text-sm">{open.length} open</span>
        </div>
        {open.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing is wrong right now.</p>
        ) : (
          open.map((a) => (
            <div key={a.id} className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground items-start">
              <span className={`min-w-20 font-bold ${SEVERITY_COLOR[a.severity]}`}>{a.severity}</span>
              <span className="grow min-w-0 whitespace-normal">{a.message}</span>
              <span className="text-muted-foreground text-sm whitespace-nowrap">{timeAgo(a.openedAt)}</span>
            </div>
          ))
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 overflow-x-auto p-0">
        <div className="flex items-center gap-3 justify-between border-b border-border px-4 py-3.5">
          <h2>History</h2>
          <span className="text-muted-foreground text-sm">Latest 50</span>
        </div>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm p-4">No alerts yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Opened</th>
                <th>Project</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((a) => (
                <tr key={a.id}>
                  <td className="text-muted-foreground text-sm">{new Date(a.openedAt).toLocaleString()}</td>
                  <td>{names[a.slug] ? <Link href={`/projects/${a.slug}`}>{names[a.slug]}</Link> : <span className="text-muted-foreground">{a.slug}</span>}</td>
                  <td className="max-w-105 whitespace-normal">{a.message}</td>
                  <td>
                    {a.resolvedAt ? (
                      <span className="text-muted-foreground text-sm">Cleared {timeAgo(a.resolvedAt)}</span>
                    ) : (
                      <span className={`font-bold ${SEVERITY_COLOR[a.severity]}`}>Open</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
