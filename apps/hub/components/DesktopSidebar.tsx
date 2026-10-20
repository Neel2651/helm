import NavLinks, { Brand } from './nav-links';
import { Button } from '@/components/ui/button';

export default function DesktopSidebar({ logoutAction }: { logoutAction: () => void | Promise<void> }) {
  return (
    <aside className="hidden border-r border-sidebar-border bg-sidebar md:flex md:flex-col md:gap-1 md:pt-[max(1.5rem,env(safe-area-inset-top))] md:pr-4 md:pb-6 md:pl-[max(1rem,env(safe-area-inset-left))]">
      <Brand className="px-2.5 pb-6 text-foreground hover:no-underline" />
      <NavLinks />
      <form action={logoutAction} className="mt-auto">
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Sign out
        </Button>
      </form>
    </aside>
  );
}
