const crypto = require('crypto');

const env = require('../../config/env');
const { EmailVerificationToken, User } = require('../../models');
const { USER_STATUS } = require('../../utils/enums');
const { sendVerificationEmail } = require('./email.provider');

const generateOpaqueToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

const expiryDate = () => new Date(Date.now() + env.emailVerification.expiresInHours * 60 * 60 * 1000);

/**
 * Creates a fresh verification token row (raw token returned once, never
 * stored) and hands it to the email provider. Used both at registration
 * and by resendVerification.
 */
const createAndSendVerificationToken = async (user, { transaction } = {}) => {
  const rawToken = generateOpaqueToken();

  await EmailVerificationToken.create(
    { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: expiryDate() },
    { transaction }
  );

  // Intentionally fire this after the row exists, but the caller
  // decides whether to await it before or after commit — see
  // auth.service.js for how registration sequences this.
  return async () => sendVerificationEmail(user, rawToken);
};

/**
 * Resend, with a cooldown to prevent verification-email spam (§8). Always
 * resolves the same way regardless of whether the email exists or is
 * already verified — callers must not branch on this to avoid account
 * enumeration; see auth.service.js.
 */
const resendVerification = async (user) => {
  if (!user || user.status !== USER_STATUS.PENDING || user.emailVerifiedAt) {
    return; // nothing to do — silently a no-op, same external response either way
  }

  const mostRecent = await EmailVerificationToken.findOne({
    where: { userId: user.id },
    order: [['createdAt', 'DESC']],
  });

  if (mostRecent) {
    const cooldownMs = env.emailVerification.resendCooldownSeconds * 1000;
    const elapsedMs = Date.now() - new Date(mostRecent.createdAt).getTime();
    if (elapsedMs < cooldownMs) {
      return; // within cooldown — do nothing, respond generically regardless
    }
  }

  // Invalidate any still-outstanding tokens before issuing a new one, so
  // at most one verification link is ever valid at a time.
  await EmailVerificationToken.update(
    { usedAt: new Date() },
    { where: { userId: user.id, usedAt: null } }
  );

  const send = await createAndSendVerificationToken(user);
  await send();
};

/**
 * Validates and consumes a verification token. Returns true on success
 * (and marks the user verified/active), false for any failure mode
 * (unknown, expired, already used) — deliberately the same outcome shape
 * for all failure modes so the API layer can give one generic response.
 */
const verifyEmailToken = async (rawToken) => {
  const tokenRow = await EmailVerificationToken.findOne({ where: { tokenHash: hashToken(rawToken) } });

  if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt.getTime() <= Date.now()) {
    return false;
  }

  await tokenRow.update({ usedAt: new Date() });

  const user = await User.findByPk(tokenRow.userId);
  if (!user) {
    return false;
  }

  const updates = { emailVerifiedAt: new Date() };
  if (user.status === USER_STATUS.PENDING) {
    updates.status = USER_STATUS.ACTIVE;
  }
  await user.update(updates);

  return true;
};

module.exports = { createAndSendVerificationToken, resendVerification, verifyEmailToken };
