import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Gate for the institutional administration section (§42). Unauthenticated
 * -> /login; authenticated but with no institutional admin role -> /dashboard.
 * This is route-level UX only — every actual admin action is still
 * independently permission-checked by the backend (see Can.jsx and
 * docs/university-management.md).
 */
const ADMIN_ROLES = ['SUPER_ADMIN', 'UNIVERSITY_ADMIN'];

const AdminRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const roles = user?.roles || [];
  const isInstitutionalAdmin = ADMIN_ROLES.some((role) => roles.includes(role));

  return isInstitutionalAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default AdminRoute;
