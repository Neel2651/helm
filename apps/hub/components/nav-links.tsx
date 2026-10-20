'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/backups', label: 'Backups' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/clients', label: 'Clients' },
  { href: '/settings', label: 'Settings' },
];

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 text-lg font-extrabold tracking-tight', className)}>
      <span className="relative size-6.5 rounded-full border-[3px] border-primary" aria-hidden="true">
        <span className="absolute inset-1 rounded-full bg-accent" />
      </span>
      Helm
    </Link>
  );
}

/** Shared by the desktop sidebar and the mobile drawer. */
export default function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          aria-current={isActive(link.href) ? 'page' : undefined}
          // min-h-11 keeps every target at the 44px touch guideline; the old 9px padding
          // gave roughly 37px, which is a real miss rate on a phone.
          className={cn(
            'flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors',
            isActive(link.href)
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
