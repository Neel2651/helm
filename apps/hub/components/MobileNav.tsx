'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MenuIcon } from 'lucide-react';
import NavLinks, { Brand } from './nav-links';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export default function MobileNav({ logoutAction }: { logoutAction: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Client-side navigation does not unmount the layout, so the drawer would otherwise stay
  // open after a link is tapped. Each link also closes it; this covers back/forward.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      // pt-safe is the fix for the original bug: with viewportFit:'cover' and a translucent
      // status bar, an unpadded bar renders underneath the notch and cannot be tapped.
      className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar/95 pt-safe backdrop-blur md:hidden"
    >
      <div className="flex h-14 items-center gap-2 pr-3 pl-[max(0.75rem,env(safe-area-inset-left))]">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu" className="-ml-2 size-11">
              <MenuIcon className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[min(18rem,85vw)] flex-col gap-1 pt-[calc(1rem+env(safe-area-inset-top))] pr-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]"
          >
            {/* Radix requires a title on a dialog; this one is also the drawer's brand. */}
            <SheetHeader className="p-0">
              <SheetTitle asChild>
                <Brand className="text-foreground hover:no-underline" />
              </SheetTitle>
            </SheetHeader>
            <NavLinks onNavigate={() => setOpen(false)} />
            <form action={logoutAction} className="mt-auto">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </SheetContent>
        </Sheet>
        <Brand className="text-foreground hover:no-underline" />
      </div>
    </header>
  );
}
