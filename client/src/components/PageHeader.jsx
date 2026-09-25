import { Link } from 'react-router-dom';

/**
 * Shared page header for administration screens: breadcrumbs, a title,
 * and a slot for page-level actions (e.g. a "Create" button) — see
 * chunk brief §43 ("page headers", "breadcrumbs").
 */
const PageHeader = ({ breadcrumbs = [], title, actions }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      {breadcrumbs.length > 0 && (
        <nav className="mb-1 text-xs text-slate-500">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label}>
              {index > 0 && <span className="mx-1">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-brand-700">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
    </div>
    {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
