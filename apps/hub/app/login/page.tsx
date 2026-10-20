import type { Metadata } from 'next';
import { login } from '../actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const metadata: Metadata = { title: 'Sign in · Helm' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <main className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="relative size-11 rounded-full border-4 border-primary" aria-hidden="true">
            <span className="absolute inset-1.5 rounded-full bg-accent" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight">Helm</h1>
            <p className="text-sm text-muted-foreground">
              Monitor, back up and configure every project from one place.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-sm">
          {error ? <Alert variant="error">Wrong password. Try again.</Alert> : null}

          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                required
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••••••"
              />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Private dashboard. Only the owner can sign in.
        </p>
      </main>
    </div>
  );
}
