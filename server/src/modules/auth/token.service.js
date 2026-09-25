const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const env = require('../../config/env');
const { parseDurationMs, parseDurationSeconds } = require('../../utils/duration');
const { RefreshToken } = require('../../models');

/**
 * Everything token-related: signing/verifying short-lived JWT access
 * tokens, and issuing/rotating/revoking opaque, DB-backed refresh tokens.
 * See docs/authentication.md for the full strategy.
 */

// ---- Access tokens (stateless JWT) -----------------------------------------

/**
 * Minimal claim set only: subject (the user's public uuid, never the
 * internal auto-increment id), a per-token id, and a type discriminator
 * so a refresh token could never be replayed as an access token even if
 * someone tried to hand one to a JWT-verifying endpoint.
 */
const signAccessToken = (user) => {
  const token = jwt.sign(
    { sub: user.uuid, jti: crypto.randomUUID(), type: 'access' },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );

  return { token, expiresIn: parseDurationSeconds(env.jwt.accessExpiresIn) };
};

/** Throws (jsonwebtoken's own error types) if invalid, expired, or malformed. */
const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);

// ---- Refresh tokens (opaque, DB-backed, revocable) -------------------------

const generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

const issueRefreshToken = async (userId, { transaction } = {}) => {
  const rawToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + parseDurationMs(env.jwt.refreshExpiresIn));

  await RefreshToken.create(
    { userId, tokenHash: hashToken(rawToken), expiresAt },
    { transaction }
  );

  return rawToken;
};

/**
 * Resolves a raw refresh token to its DB row, only if it is currently
 * usable (exists, not revoked, not expired). Returns null otherwise —
 * callers decide how to respond; this function never leaks *why* a token
 * was rejected.
 */
const findUsableRefreshToken = async (rawToken) => {
  // No .unscoped() needed: WHERE works on tokenHash even though the
  // default scope excludes it from what's SELECTed back.
  const tokenRow = await RefreshToken.findOne({ where: { tokenHash: hashToken(rawToken) } });

  if (!tokenRow || tokenRow.revokedAt || tokenRow.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return tokenRow;
};

const revokeRefreshToken = (tokenRow, { transaction } = {}) =>
  tokenRow.update({ revokedAt: new Date() }, { transaction });

/**
 * Refresh-token rotation: the presented token is revoked and a new one
 * issued in its place, so a stolen-then-reused refresh token is a single
 * use at most before it stops working for everyone (including the
 * legitimate owner, who will need to log in again — an accepted tradeoff
 * for detecting reuse).
 */
const rotateRefreshToken = async (tokenRow, { transaction } = {}) => {
  await revokeRefreshToken(tokenRow, { transaction });
  await tokenRow.update({ lastUsedAt: new Date() }, { transaction });
  return issueRefreshToken(tokenRow.userId, { transaction });
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  findUsableRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
};
