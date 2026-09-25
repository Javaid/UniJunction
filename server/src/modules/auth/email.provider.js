const logger = require('../../utils/logger');

/**
 * Stand-in for a real transactional email provider (SES, SendGrid,
 * Postmark, ...). No provider is wired up yet — this chunk only builds
 * the architecture so one can be dropped in later without touching
 * verification.service.js or auth.service.js. For now it just logs,
 * which is enough to develop and test the verification flow locally
 * (the token is visible in server logs instead of an inbox).
 */
const sendVerificationEmail = async (user, rawToken) => {
  logger.info(
    `[email.provider] Verification email for ${user.email} — token: ${rawToken} ` +
      '(no email provider configured; this is a development-time log only)'
  );
};

module.exports = { sendVerificationEmail };
