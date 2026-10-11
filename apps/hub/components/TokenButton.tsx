'use client';

import { useState } from 'react';

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
    <div className="stack" style={{ gap: 10 }}>
      <button type="button" className="btn btn-sm" onClick={rotate} disabled={busy}>
        {busy ? 'Working…' : token ? 'Rotate again' : 'Generate or rotate token'}
      </button>
      {error ? <div className="notice notice-error">{error}</div> : null}
      {token ? (
        <div className="secret-box">
          <strong style={{ fontSize: 14 }}>Copy this token now. It will not be shown again.</strong>
          <code>{token}</code>
          <span className="small muted">Set it on the server as HELM_COLLECTOR_TOKEN.</span>
        </div>
      ) : null}
    </div>
  );
}
