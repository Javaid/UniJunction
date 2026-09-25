/**
 * Central environment configuration.
 *
 * Every other module reads config through this file instead of
 * `process.env` directly, so validation and defaults live in one place.
 */
require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'academic_connect',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    encrypt: toBool(process.env.DB_ENCRYPT, false),
    pool: {
      max: toInt(process.env.DB_POOL_MAX, 10),
      min: toInt(process.env.DB_POOL_MIN, 0),
      acquire: toInt(process.env.DB_POOL_ACQUIRE, 30000),
      idle: toInt(process.env.DB_POOL_IDLE, 10000),
    },
  },

  jwt: {
    // Access tokens are short-lived and stateless (verified by signature
    // alone). Refresh tokens are opaque, DB-backed, and revocable — they
    // have no secret of their own, only a configurable lifetime. See
    // docs/authentication.md.
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  security: {
    bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 12),
  },

  emailVerification: {
    expiresInHours: toInt(process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS, 24),
    resendCooldownSeconds: toInt(process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS, 60),
  },

  rateLimit: {
    authWindowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

env.isProduction = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';

module.exports = env;
