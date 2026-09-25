import { NavLink, Outlet } from 'react-router-dom';

const navLinkClasses = ({ isActive }) =>
  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-700'
  }`;

/**
 * Sidebar shell for the institutional administration section (§43).
 * Nested inside MainLayout, so the global header/nav/footer stay in
 * place — this only adds the admin-section sidebar.
 */
const AdminLayout = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
    <aside className="space-y-1">
      <NavLink to="/admin" end className={navLinkClasses}>
        Dashboard
      </NavLink>
      <NavLink to="/admin/universities" className={navLinkClasses}>
        Universities
      </NavLink>
    </aside>
    <div className="min-w-0">
      <Outlet />
    </div>
  </div>
);

export default AdminLayout;
