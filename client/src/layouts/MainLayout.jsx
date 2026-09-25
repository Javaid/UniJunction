import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/login', label: 'Log In' },
  { to: '/register', label: 'Register' },
];

const navLinkClasses = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-brand-700'
  }`;

const MainLayout = () => (
  <div className="flex min-h-screen flex-col">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          Academic Connect
        </span>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClasses}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>

    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Outlet />
    </main>

    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
        &copy; {new Date().getFullYear()} Academic Connect
      </div>
    </footer>
  </div>
);

export default MainLayout;
