import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Gate for authenticated-only pages. Unauthenticated -> redirect to
 * /login; authenticated -> render the nested route. Role-based page
 * routing is out of scope for this chunk — see docs/authentication.md,
 * "University-scoped authorization (future)".
 */
const ProtectedRoute = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
