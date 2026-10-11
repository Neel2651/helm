import type { Metadata } from 'next';
import { login } from '../actions';

export const metadata: Metadata = { title: 'Sign in · Helm' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="row">
          <span className="brand-mark" aria-hidden="true" style={{ width: 30, height: 30, position: 'relative', borderRadius: '50%', border: '3px solid var(--accent)' }} />
          <h1>Sign in to Helm</h1>
        </div>
        <p className="muted small">Private dashboard. Only the owner can sign in.</p>

        {error ? <div className="notice notice-error" role="alert">Wrong password. Try again.</div> : null}

        <form action={login} className="form" style={{ gap: 14 }}>
          <label className="field">
            <span className="field-label">Password</span>
            <input type="password" name="password" required autoFocus autoComplete="current-password" />
          </label>
          <button type="submit" className="btn btn-primary">Sign in</button>
        </form>
      </div>
    </div>
  );
}
