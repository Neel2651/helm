import type { Metadata } from 'next';
import { login } from '../actions';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Sign in · Helm' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="rounded-lg border border-border bg-card p-4.5 shadow-sm min-w-0 flex w-full max-w-95 flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="brand-mark relative size-7.5 rounded-full border-[3px] border-primary" aria-hidden="true"/>
          <h1>Sign in to Helm</h1>
        </div>
        <p className="text-muted-foreground text-sm">Private dashboard. Only the owner can sign in.</p>

        {error ? <div className="rounded-lg border border-degraded-border bg-degraded-soft px-3.5 py-3 text-sm text-degraded border-down-border-soft bg-down-soft text-down" role="alert">Wrong password. Try again.</div> : null}

        <form action={login} className="form gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Password</span>
            <input type="password" name="password" required autoFocus autoComplete="current-password" />
          </label>
          <Button type="submit">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
