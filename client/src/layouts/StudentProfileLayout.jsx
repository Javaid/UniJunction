import { NavLink, Outlet } from 'react-router-dom';

const navLinkClasses = ({ isActive }) =>
  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-700'
  }`;

const TABS = [
  { to: '/student/profile', label: 'Profile', end: true },
  { to: '/student/profile/edit', label: 'Edit Profile' },
  { to: '/student/profile/skills', label: 'Skills' },
  { to: '/student/profile/interests', label: 'Interests' },
  { to: '/student/profile/research', label: 'Research Interests' },
  { to: '/student/profile/certifications', label: 'Certifications' },
  { to: '/student/profile/achievements', label: 'Achievements' },
  { to: '/student/profile/goals', label: 'Goals' },
];

/**
 * §48: sectioned navigation instead of one giant form — each concern
 * (skills, interests, research, ...) gets its own page, all nested under
 * this shared shell (itself nested inside MainLayout).
 */
const StudentProfileLayout = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
    <aside className="space-y-1">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={navLinkClasses}>
          {tab.label}
        </NavLink>
      ))}
    </aside>
    <div className="min-w-0">
      <Outlet />
    </div>
  </div>
);

export default StudentProfileLayout;
