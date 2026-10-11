import Nav from '../../components/Nav';
import { logout } from '../actions';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Nav logoutAction={logout} />
      <main className="main">{children}</main>
    </div>
  );
}
