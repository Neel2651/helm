'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RevealValueProps {
  slug: string;
  id: string;
  label: string;
}

/**
 * "Reveal" next to a masked integration value. Fetches the decrypted value only once the
 * dialog is actually opened — not on page render — and never caches it past that.
 */
export default function RevealValue({ slug, id, label }: RevealValueProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Drop it from memory once the dialog closes rather than leaving it sitting there.
      setValue(null);
      setCopied(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${slug}/integrations/${id}/reveal`, { method: 'POST' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body: { value: string } = await res.json();
      setValue(body.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy. Select the value and copy it manually.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="xs" className="h-auto p-0 shrink-0">
          Reveal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>This value is encrypted at rest. Anyone who can sign in to Helm can reveal it.</DialogDescription>
        </DialogHeader>
        {busy ? (
          <p className="text-muted-foreground text-sm">Decrypting…</p>
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : value !== null ? (
          <div className="flex flex-col gap-3">
            <code className="block max-h-40 overflow-auto rounded-lg border border-border bg-secondary p-3 font-mono text-[13px] break-all">
              {value}
            </code>
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
