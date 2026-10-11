import Link from 'next/link';
import { listAlerts, listProjects } from '../../../lib/store';
import { telegramConfigured } from '../../../lib/notify';
import { sendTestAlert } from '../../actions';
import { timeAgo } from '../../../components/ui';
import type { AlertSeverity } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const SEVERITY_COLOR: Record<AlertSeverity, string> = { critical: 'var(--down)', warning: 'var(--degraded)' };

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
      <header className="row-wrap between">
        <div>
          <h1>Alerts</h1>
          <p className="muted small">Sent once when a problem starts and once when it clears.</p>
        </div>
      </header>

      {!telegramConfigured() ? (
        <div className="notice">
          Telegram is not connected, so alerts are only written to the hub log. Set HELM_TELEGRAM_BOT_TOKEN and HELM_TELEGRAM_CHAT_ID, then restart the hub.
        </div>
      ) : null}

      {test === 'ok' ? <div className="card" style={{ borderColor: '#b9dcd5' }}>Test message sent to Telegram.</div> : null}
      {test && test !== 'ok' ? <div className="notice notice-error" role="alert">Test failed: {test}</div> : null}

      <section className="card row-wrap between">
        <div>
          <strong>Telegram</strong>
          <p className="muted small">
            {telegramConfigured() ? 'Connected. Send a test message to confirm.' : 'Not connected.'}
          </p>
        </div>
        <form action={sendTestAlert}>
          <button type="submit" className="btn" disabled={!telegramConfigured()}>Send test message</button>
        </form>
      </section>

      <section className="card stack" style={{ gap: 12 }}>
        <div className="row between">
          <h2>Open now</h2>
          <span className="muted small">{open.length} open</span>
        </div>
        {open.length === 0 ? (
          <p className="muted small">Nothing is wrong right now.</p>
        ) : (
          open.map((a) => (
            <div key={a.id} className="kv" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: SEVERITY_COLOR[a.severity], fontWeight: 700, minWidth: 80 }}>{a.severity}</span>
              <span className="grow" style={{ whiteSpace: 'normal' }}>{a.message}</span>
              <span className="muted small" style={{ whiteSpace: 'nowrap' }}>{timeAgo(a.openedAt)}</span>
            </div>
          ))
        )}
      </section>

      <section className="card table-wrap" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2>History</h2>
          <span className="muted small">Latest 50</span>
        </div>
        {history.length === 0 ? (
          <p className="muted small" style={{ padding: 16 }}>No alerts yet.</p>
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
                  <td className="muted small">{new Date(a.openedAt).toLocaleString()}</td>
                  <td>{names[a.slug] ? <Link href={`/projects/${a.slug}`}>{names[a.slug]}</Link> : <span className="muted">{a.slug}</span>}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 420 }}>{a.message}</td>
                  <td>
                    {a.resolvedAt ? (
                      <span className="muted small">Cleared {timeAgo(a.resolvedAt)}</span>
                    ) : (
                      <span style={{ color: SEVERITY_COLOR[a.severity], fontWeight: 700 }}>Open</span>
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
