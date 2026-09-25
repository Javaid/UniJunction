import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { logoutUser } from '../store/authSlice';

const navLinkClasses = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-brand-700'
  }`;

const ADMIN_ROLES = ['SUPER_ADMIN', 'UNIVERSITY_ADMIN'];

const MainLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const isInstitutionalAdmin = (user?.roles || []).some((role) => ADMIN_ROLES.includes(role));

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Academic Connect
          </span>
          <nav className="flex items-center gap-1">
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClasses}>
                  Dashboard
                </NavLink>
                {isInstitutionalAdmin && (
                  <NavLink to="/admin" className={navLinkClasses}>
                    Admin
                  </NavLink>
                )}
                {user?.first_name && (
                  <span className="px-3 text-sm text-slate-500">Hi, {user.first_name}</span>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-brand-700"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClasses}>
                  Log In
                </NavLink>
                <NavLink to="/register" className={navLinkClasses}>
                  Register
                </NavLink>
              </>
            )}
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
};

export default MainLayout;
