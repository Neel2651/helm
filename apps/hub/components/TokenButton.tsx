'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

// Rotates a project's collector token. The token is shown once and never stored in plain text.
export default function TokenButton({ slug }: { slug: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rotate() {
    if (token && !window.confirm('Rotating replaces the current token. Servers using the old token will stop reporting. Continue?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${slug}/token`, { method: 'POST' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body: { token: string } = await res.json();
      setToken(body.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 gap-2.5">
      <Button type="button" variant="outline" size="sm" onClick={rotate} disabled={busy}>
        {busy ? 'Working…' : token ? 'Rotate again' : 'Generate or rotate token'}
      </Button>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {token ? (
        <div className="flex flex-col gap-2 rounded-lg border border-accent-border bg-accent px-3.5 py-3 [&_code]:text-[13px] [&_code]:break-all">
          <strong className="text-sm">Copy this token now. It will not be shown again.</strong>
          <code>{token}</code>
          <span className="text-sm text-muted-foreground">Set it on the server as HELM_COLLECTOR_TOKEN.</span>
        </div>
      ) : null}
    </div>
  );
}
