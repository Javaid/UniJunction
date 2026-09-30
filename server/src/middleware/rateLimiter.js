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

/**
 * §44: a sensible, deliberately generous limiter for student-profile
 * mutation endpoints (create/update profile, add/remove a skill or
 * interest, ...). Ordinary profile editing (a student adding several
 * skills or updating a few sections in one sitting) should never trip
 * this — it exists only to blunt scripted abuse, not to get in the way
 * of normal use. Separate config from the auth limiter since profile
 * editing is a very different traffic shape from login/register.
 */
const profileMutationRateLimiter = rateLimit({
  windowMs: env.rateLimit.profileWindowMs,
  max: env.rateLimit.profileMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

module.exports = { authRateLimiter, profileMutationRateLimiter };
