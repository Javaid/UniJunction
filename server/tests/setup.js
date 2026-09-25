/**
 * Jest global setup — runs before any test file's imports. Ensures a JWT
 * signing secret exists so token.service can sign/verify in tests without
 * requiring a real secret to be configured in the environment. Does not
 * override a secret the environment already provides.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-only-jwt-secret-do-not-use-in-production';
