const ApiError = require('../../utils/ApiError');

/**
 * Reusable authorization layer, built on the auth context requireAuth
 * attaches to `req.user`. Must run after requireAuth on any route that
 * uses these — 401 (unauthenticated) and 403 (authenticated but not
 * authorized) are kept strictly distinct (§22).
 *
 * University-scoped authorization (platform admin vs. university admin
 * vs. faculty vs. student, each scoped to their own institution) is
 * intentionally NOT implemented here — see docs/authentication.md,
 * "University-scoped authorization (future)". These checks are global,
 * role/permission-only.
 */
const requireAuthenticated = (req) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }
};

const requireRole = (role) => (req, res, next) => {
  try {
    requireAuthenticated(req);
    if (!req.user.roles.includes(role)) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  } catch (error) {
    next(error);
  }
};

const requireAnyRole = (roles) => (req, res, next) => {
  try {
    requireAuthenticated(req);
    if (!roles.some((role) => req.user.roles.includes(role))) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  } catch (error) {
    next(error);
  }
};

const requirePermission = (permission) => (req, res, next) => {
  try {
    requireAuthenticated(req);
    if (!req.user.permissions.includes(permission)) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  } catch (error) {
    next(error);
  }
};

const requireAnyPermission = (permissions) => (req, res, next) => {
  try {
    requireAuthenticated(req);
    if (!permissions.some((permission) => req.user.permissions.includes(permission))) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireRole, requireAnyRole, requirePermission, requireAnyPermission };
