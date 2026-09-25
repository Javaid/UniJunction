const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Shared limiter for authentication endpoints that are attractive to
 * brute-force/enumeration/spam abuse: login, register, resend-verification,
 * refresh. Configurable via AUTH_RATE_LIMIT_WINDOW_MS / AUTH_RATE_LIMIT_MAX
 * so it can be loosened for local development or tightened in production
 * without a code change.
 *
 * Disabled during automated tests (`env.isTest`) — the test suite makes
 * many requests in quick succession on purpose, and this limiter is not
 * what those tests are checking.
 */
const authRateLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

module.exports = { authRateLimiter };
