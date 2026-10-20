import DesktopSidebar from '../../components/DesktopSidebar';
import MobileNav from '../../components/MobileNav';
import { logout } from '../actions';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // min-h-dvh, not min-h-screen: 100vh is wrong on iOS Safari, where it includes the
    // area behind the URL bar.
    <div className="min-h-dvh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <MobileNav logoutAction={logout} />
      <DesktopSidebar logoutAction={logout} />
      <main className="flex min-w-0 flex-col gap-6 px-[max(1rem,env(safe-area-inset-left))] pt-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] md:px-9 md:pt-7 md:pb-12">
        {children}
      </main>
    </div>
  );
}
