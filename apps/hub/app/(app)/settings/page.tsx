import { getGoogleAuth } from '../../../lib/store';
import { driveStatus, oauthClientConfigured, redirectUri } from '../../../lib/drive';
import { disconnectGoogleDrive, testGoogleDrive } from '../../actions';
import { timeAgo } from '../../../components/display';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export const dynamic = 'force-dynamic';

interface SettingsPageProps {
  searchParams: Promise<{
    google_connected?: string;
    google_disconnected?: string;
    google_error?: string;
    google_ok?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const q = await searchParams;
  const auth = getGoogleAuth();
  const status = await driveStatus();
  const clientReady = oauthClientConfigured();

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1>Settings</h1>
          <p className="text-muted-foreground text-sm">Connections Helm uses to do its work.</p>
        </div>
      </header>

      {q.google_connected ? <Alert variant="success">Google Drive connected.</Alert> : null}
      {q.google_disconnected ? <Alert variant="warning">Google Drive disconnected.</Alert> : null}
      {q.google_ok ? <Alert variant="success">Connection works. Google issued a fresh access token.</Alert> : null}
      {q.google_error ? <Alert variant="error">{q.google_error}</Alert> : null}

      <section className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h2>Google Drive</h2>
            <p className="text-muted-foreground text-sm">Where encrypted database backups are uploaded.</p>
          </div>
          <span className={`badge badge-${status.connected ? 'up' : auth || status.error ? 'down' : 'unknown'}`}>
            {status.connected ? 'Connected' : auth || status.error ? 'Not working' : 'Not connected'}
          </span>
        </div>

        {!clientReady ? (
          <Alert variant="warning">
            No OAuth client yet. Set <code className="font-mono text-[13px]">HELM_GOOGLE_CLIENT_ID</code> and{' '}
            <code className="font-mono text-[13px]">HELM_GOOGLE_CLIENT_SECRET</code> on the hub, then restart it.
          </Alert>
        ) : null}

        {status.error ? <Alert variant="error">{status.error}</Alert> : null}

        {status.usingEnvFallback ? (
          <Alert variant="warning">
            Using the refresh token from <code className="font-mono text-[13px]">HELM_GOOGLE_REFRESH_TOKEN</code>. Press Connect to
            replace it with one Helm manages and renews itself.
          </Alert>
        ) : null}

        <div className="flex flex-col">
          <div className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground">
            <span>Account</span>
            <span>{status.email || auth?.email || '—'}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground">
            <span>Connected</span>
            <span>{auth?.connectedAt ? timeAgo(auth.connectedAt) : '—'}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground">
            <span>Token last renewed</span>
            <span>{auth?.lastRefreshAt ? timeAgo(auth.lastRefreshAt) : 'never'}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-dashed border-border py-1.5 text-sm last:border-b-0 [&>span:first-child]:text-muted-foreground">
            <span>Redirect URI to register in Google Cloud Console</span>
            <span className="font-mono text-[13px]">{redirectUri()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild><a href="/api/google/connect" aria-disabled={!clientReady}>
            {auth || status.usingEnvFallback ? 'Reconnect' : 'Connect Google Drive'}
          </a></Button>
          <form action={testGoogleDrive}>
            <Button type="submit" variant="outline" disabled={!status.usingEnvFallback && !auth}>
              Test connection
            </Button>
          </form>
          <form action={disconnectGoogleDrive}>
            <Button type="submit" variant="destructive" disabled={!auth}>
              Disconnect
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground">
          Helm asks only for the <code className="font-mono text-[13px]">drive.file</code> scope, so it can see the files and folders it
          creates and nothing else in the Drive. Once connected it renews its own access indefinitely — until you press
          Disconnect, change the Google account password, or remove access at myaccount.google.com/permissions.
        </p>
      </section>
    </>
  );
}
