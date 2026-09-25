/**
 * The single, centralized place a User model instance is turned into an
 * API-safe JSON shape. Every endpoint that returns user data — /auth/me,
 * /auth/login, /api/admin/users — must go through this function rather
 * than serializing a model directly, so there is exactly one place that
 * decides what a "public user" looks like.
 *
 * Never includes: password_hash, refresh/verification token data, or any
 * other internal field. `roles` defaults to [] rather than throwing if
 * the roles association wasn't eager-loaded, since not every caller
 * needs them.
 */
const toPublicUser = (user) => {
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : user;

  return {
    id: plain.uuid,
    email: plain.email,
    first_name: plain.firstName,
    last_name: plain.lastName,
    display_name: plain.displayName,
    status: plain.status,
    roles: Array.isArray(plain.roles) ? plain.roles.map((role) => role.name) : [],
  };
};

/**
 * Same as toPublicUser, plus the user's own effective permissions
 * (union of every role's permissions). Used only for a user's OWN
 * session context (login, /auth/me) — the frontend's permission-gated
 * UI (Chunk 04, `Can`) needs this to decide what to show, but showing
 * someone ELSE's permissions (e.g. in an admin user listing) has no
 * legitimate use, so `toPublicUser` deliberately doesn't include it.
 * Requires `roles` to have been eager-loaded with their `permissions`
 * (see `withRolesAndPermissions` in auth.service.js).
 */
const toAuthenticatedUser = (user) => {
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : user;
  const permissions = Array.isArray(plain.roles)
    ? [...new Set(plain.roles.flatMap((role) => (role.permissions || []).map((p) => p.name)))]
    : [];

  return { ...toPublicUser(user), permissions };
};

module.exports = { toPublicUser, toAuthenticatedUser };
