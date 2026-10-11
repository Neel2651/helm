'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/projects', label: 'Projects' },
  { href: '/backups', label: 'Backups' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/clients', label: 'Clients' },
];

const SOON: string[] = [];

export default function Nav({ logoutAction }: { logoutAction: () => void | Promise<void> }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <span className="brand-mark" aria-hidden="true" />
        Helm
      </Link>

      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={`nav-link ${isActive(link.href) ? 'active' : ''}`}>
          {link.label}
        </Link>
      ))}

      {SOON.map((label) => (
        <span key={label} className="nav-link disabled" aria-disabled="true">
          {label} <span className="nav-soon">soon</span>
        </span>
      ))}

      <div className="sidebar-foot">
        <form action={logoutAction}>
          <button type="submit" className="btn btn-sm" style={{ width: '100%' }}>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
