'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * One-line text that ellipsises when it runs out of room, with a tooltip carrying the full
 * value. The tooltip only attaches when the text is genuinely cut off, so short values do
 * not sprout pointless hover targets.
 *
 * Needs a width to truncate against, so the parent must constrain it — inside a flex or
 * grid child that means min-w-0, which is why `grow min-w-0` shows up around these.
 */
export default function Truncate({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  /** Tooltip text, when the full value differs from what is rendered. */
  title?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setClipped(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  const text = (
    <span ref={ref} className={cn('block truncate', className)}>
      {children}
    </span>
  );

  if (!clipped) return text;

  return (
    <Tooltip>
      {/* asChild so the trigger is the span itself and layout does not change when the
          tooltip appears or disappears. */}
      <TooltipTrigger asChild>{text}</TooltipTrigger>
      <TooltipContent className="max-w-xs break-words">{title ?? children}</TooltipContent>
    </Tooltip>
  );
}
