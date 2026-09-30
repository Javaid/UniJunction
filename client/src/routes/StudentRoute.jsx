import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Gate for the student-profile section (§38: only a user with the
 * STUDENT role has any legitimate reason to be here — creating a
 * profile additionally requires an active STUDENT membership, checked
 * server-side). Unauthenticated -> /login; authenticated without the
 * STUDENT role -> /dashboard. Same pattern as AdminRoute.jsx — this is
 * route-level UX only, never a security control; the backend
 * independently enforces everything.
 */
const StudentRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (user?.roles || []).includes('STUDENT') ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default StudentRoute;
