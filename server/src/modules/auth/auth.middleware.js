const { verifyAccessToken } = require('./token.service');
const { User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { USER_STATUS } = require('../../utils/enums');

const UNAUTHENTICATED = () => new ApiError(401, 'Authentication required.');

/**
 * Shared resolution logic for both requireAuth and optionalAuth: turns a
 * request's Bearer token into an auth context, or returns null if there
 * isn't a valid one. Never throws for a merely-absent/invalid token —
 * callers decide whether that's fatal.
 */
const resolveAuthContext = async (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return null;
  }

  if (payload.type !== 'access' || !payload.sub) {
    return null;
  }

  const user = await User.findOne({
    where: { uuid: payload.sub },
    include: [{ association: 'roles', include: [{ association: 'permissions' }] }],
  });

  if (!user) {
    return null;
  }

  // Status can change after the token was issued (e.g. an admin
  // suspends the account mid-session) — re-checked on every request
  // rather than trusted from the token. See §17 / docs/authentication.md.
  if (![USER_STATUS.ACTIVE, USER_STATUS.PENDING].includes(user.status)) {
    return null;
  }

  return {
    id: user.uuid,
    internalId: user.id,
    email: user.email,
    status: user.status,
    roles: user.roles.map((role) => role.name),
    permissions: [...new Set(user.roles.flatMap((role) => role.permissions.map((p) => p.name)))],
  };
};

/**
 * Verifies the Bearer access token, resolves the user, and attaches a
 * minimal auth context to `req.user`. Every failure mode — missing
 * header, malformed token, expired token, invalid signature, unknown
 * user, inactive user — collapses to the same generic 401 (§16): the
 * response never reveals *which* of those happened.
 *
 * `req.user` shape: { id (public uuid), internalId, email, status,
 * roles: string[], permissions: string[] }. Downstream RBAC middleware
 * (rbac.middleware.js) reads `roles`/`permissions` from this.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authContext = await resolveAuthContext(req);
    if (!authContext) {
      throw UNAUTHENTICATED();
    }
    req.user = authContext;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Same resolution as requireAuth, but never rejects: `req.user` is set
 * when a valid token is present, and left `undefined` otherwise. For
 * public endpoints whose response shape varies by caller (e.g.
 * university listings — see docs/university-management.md, "Public vs.
 * admin data") without requiring authentication to view them at all.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authContext = await resolveAuthContext(req);
    if (authContext) {
      req.user = authContext;
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireAuth;
module.exports.optionalAuth = optionalAuth;
