'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * A one-line, clipped error in a table cell that opens the full text in a dialog.
 *
 * Backup failures carry stack-ish messages and command output that are far too long for a
 * cell. Wrapping them stretches the row and skews every column; clipping alone hides the
 * part you actually need. So: clip in the table, full text on tap.
 */
export default function ErrorDetail({
  message,
  title = 'Error details',
  context,
  className,
}: {
  message: string;
  title?: string;
  /** Shown under the title, e.g. which project and when. */
  context?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title={message}
          className={cn(
            'block max-w-full cursor-pointer truncate text-left text-sm text-down underline-offset-2 hover:underline',
            className,
          )}
        >
          {message}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[min(42rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {context ? <DialogDescription>{context}</DialogDescription> : null}
        </DialogHeader>
        {/* pre-wrap keeps command output readable; break-words stops a long URL or path
            from pushing the dialog wider than the screen. */}
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-border bg-secondary p-3 font-mono text-[13px] leading-6 whitespace-pre-wrap break-words">
          {message}
        </div>
      </DialogContent>
    </Dialog>
  );
}
