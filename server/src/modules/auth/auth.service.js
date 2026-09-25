const { sequelize, User, Role } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { USER_STATUS } = require('../../utils/enums');
const { toPublicUser, toAuthenticatedUser } = require('../../utils/userSerializer');
const { hashPassword, verifyPassword } = require('./password.service');
const {
  signAccessToken,
  issueRefreshToken,
  findUsableRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} = require('./token.service');
const { createAndSendVerificationToken, resendVerification, verifyEmailToken } = require('./verification.service');

const DEFAULT_SELF_REGISTRATION_ROLE = 'STUDENT';

const withRolesAndPermissions = (userId) =>
  User.findByPk(userId, {
    include: [{ association: 'roles', include: [{ association: 'permissions' }] }],
  });

/**
 * Registration: creates the user, assigns the fixed default role, and
 * creates a verification token, all inside one transaction — a failure
 * at any step leaves no partially-created account (see §32 of the
 * chunk brief; docs/authentication.md, "Registration flow").
 *
 * The client can never choose a role here — DEFAULT_SELF_REGISTRATION_ROLE
 * is the only role self-registration ever grants.
 */
const register = async ({ email, password, firstName, lastName }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ApiError(409, 'An account with this email address already exists.');
  }

  const passwordHash = await hashPassword(password);

  let user;
  let sendEmail;
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const createdUser = await User.create(
        { email: normalizedEmail, passwordHash, firstName, lastName },
        { transaction }
      );

      const defaultRole = await Role.findOne({
        where: { name: DEFAULT_SELF_REGISTRATION_ROLE },
        transaction,
      });
      if (!defaultRole) {
        // Reference data missing — a deployment/seed problem, not a user
        // error. See database/seed_rbac.sql.
        throw new ApiError(500, 'Registration is not available right now.');
      }
      await createdUser.addRole(defaultRole, { transaction });

      const sender = await createAndSendVerificationToken(createdUser, { transaction });
      return { createdUser, sender };
    });
    user = result.createdUser;
    sendEmail = result.sender;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'An account with this email address already exists.');
    }
    throw error;
  }

  // Fire after commit, outside the transaction — sending an email should
  // never hold a DB transaction open.
  await sendEmail();

  return toPublicUser(await withRolesAndPermissions(user.id));
};

/**
 * Login. Deliberately indistinguishable failure for "no such account"
 * and "wrong password" (§10) — both produce the same 401. SUSPENDED and
 * DEACTIVATED get a distinct, honest message, but only *after* the
 * password has already been verified correct, so this never helps an
 * attacker who doesn't already know the password (see docs/authentication.md,
 * "User status policy").
 */
const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const genericFailure = () => new ApiError(401, 'Invalid email or password.');

  const user = await User.unscoped().findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw genericFailure();
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw genericFailure();
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw new ApiError(403, 'Your account has been suspended.');
  }
  if (user.status === USER_STATUS.DEACTIVATED) {
    throw new ApiError(403, 'Your account has been deactivated.');
  }
  // ACTIVE and PENDING may both authenticate — a PENDING (unverified)
  // user still needs to be able to log in to request/complete
  // verification. See docs/authentication.md, "User status policy".

  await user.update({ lastLoginAt: new Date() });

  const withRoles = await withRolesAndPermissions(user.id);
  const { token: accessToken, expiresIn } = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    expiresIn,
    user: toAuthenticatedUser(withRoles),
  };
};

/** Refresh-token rotation (§13): the presented token is always revoked. */
const refresh = async (rawRefreshToken) => {
  const tokenRow = await findUsableRefreshToken(rawRefreshToken);
  if (!tokenRow) {
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const user = await User.findByPk(tokenRow.userId);
  if (!user || [USER_STATUS.SUSPENDED, USER_STATUS.DEACTIVATED].includes(user.status)) {
    await revokeRefreshToken(tokenRow);
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const newRawRefreshToken = await rotateRefreshToken(tokenRow);
  const { token: accessToken, expiresIn } = signAccessToken(user);

  return { accessToken, refreshToken: newRawRefreshToken, expiresIn };
};

/**
 * Logout revokes the refresh token if it can be found; it responds the
 * same way either way (already revoked, unknown, or expired) — there is
 * nothing useful to a caller in distinguishing those, and stateless JWT
 * access tokens already issued remain valid until they expire (§14).
 */
const logout = async (rawRefreshToken) => {
  const tokenRow = await findUsableRefreshToken(rawRefreshToken);
  if (tokenRow) {
    await revokeRefreshToken(tokenRow);
  }
};

const getCurrentUser = async (userId) => {
  const user = await withRolesAndPermissions(userId);
  return toAuthenticatedUser(user);
};

/**
 * Looks the user up and delegates to verification.service — always
 * resolves with no return value regardless of outcome (unknown email,
 * already verified, cooldown not elapsed), so the controller can give a
 * single generic response and avoid account enumeration (§8).
 */
const requestResendVerification = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });
  await resendVerification(user);
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  requestResendVerification,
  verifyEmailToken,
  withRolesAndPermissions,
};
