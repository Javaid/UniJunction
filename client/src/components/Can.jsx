import { useSelector } from 'react-redux';

/**
 * Conditionally renders based on the current user's permissions —
 * `permission` for a single check, `anyOf` for "has at least one of".
 *
 * This is a UI convenience only, not a security control: the backend
 * independently enforces every permission on every request regardless
 * of what this component shows or hides — see
 * docs/university-management.md, "Frontend permission handling."
 */
const Can = ({ permission, anyOf, children, fallback = null }) => {
  const permissions = useSelector((state) => state.auth.user?.permissions || []);

  const allowed = permission
    ? permissions.includes(permission)
    : Array.isArray(anyOf)
      ? anyOf.some((p) => permissions.includes(p))
      : false;

  return allowed ? children : fallback;
};

export default Can;
