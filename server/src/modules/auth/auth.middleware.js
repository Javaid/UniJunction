const { verifyAccessToken } = require('./token.service');
const { User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { USER_STATUS } = require('../../utils/enums');

const UNAUTHENTICATED = () => new ApiError(401, 'Authentication required.');

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
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw UNAUTHENTICATED();
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      throw UNAUTHENTICATED();
    }

    if (payload.type !== 'access' || !payload.sub) {
      throw UNAUTHENTICATED();
    }

    const user = await User.findOne({
      where: { uuid: payload.sub },
      include: [{ association: 'roles', include: [{ association: 'permissions' }] }],
    });

    if (!user) {
      throw UNAUTHENTICATED();
    }

    // Status can change after the token was issued (e.g. an admin
    // suspends the account mid-session) — re-checked on every request
    // rather than trusted from the token. See §17 / docs/authentication.md.
    if (![USER_STATUS.ACTIVE, USER_STATUS.PENDING].includes(user.status)) {
      throw UNAUTHENTICATED();
    }

    req.user = {
      id: user.uuid,
      internalId: user.id,
      email: user.email,
      status: user.status,
      roles: user.roles.map((role) => role.name),
      permissions: [...new Set(user.roles.flatMap((role) => role.permissions.map((p) => p.name)))],
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = requireAuth;
