const crypto = require('crypto');
const request = require('supertest');

const app = require('../../src/app');
const { sequelize, User, Role, RefreshToken } = require('../../src/models');
const { hashPassword } = require('../../src/modules/auth/password.service');
const { isDbAvailable, seedRbac, resetAuthTables, itIfDb } = require('../helpers/testDb');

let dbReady = false;
const itDb = itIfDb(() => dbReady);

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

beforeAll(async () => {
  dbReady = await isDbAvailable();
  if (dbReady) await seedRbac();
});

beforeEach(async () => {
  if (dbReady) await resetAuthTables();
});

afterAll(async () => sequelize.close());

const createActiveUser = async (email = 'refreshuser@example.com') => {
  const passwordHash = await hashPassword('Password123');
  const user = await User.create({ email, passwordHash, firstName: 'R', lastName: 'User', status: 'ACTIVE' });
  const role = await Role.findOne({ where: { name: 'STUDENT' } });
  await user.addRole(role);
  return user;
};

const loginAndGetTokens = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return { accessToken: res.body.access_token, refreshToken: res.body.refresh_token };
};

describe('POST /api/auth/refresh', () => {
  itDb('exchanges a valid refresh token for a new access + refresh token', async () => {
    const user = await createActiveUser();
    const { refreshToken } = await loginAndGetTokens(user.email);

    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });

    expect(res.statusCode).toBe(200);
    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.refresh_token).toEqual(expect.any(String));
    expect(res.body.refresh_token).not.toBe(refreshToken);
  });

  itDb('rotation revokes the old refresh token — reusing it fails', async () => {
    const user = await createActiveUser('rotate@example.com');
    const { refreshToken } = await loginAndGetTokens(user.email);

    const first = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(first.statusCode).toBe(200);

    const reuse = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(reuse.statusCode).toBe(401);
  });

  itDb('rejects an expired refresh token with 401', async () => {
    const user = await createActiveUser('expiredrt@example.com');
    const rawToken = 'expired-raw-token-value';
    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() - 60 * 1000), // already expired
    });

    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: rawToken });
    expect(res.statusCode).toBe(401);
  });

  itDb('rejects a revoked refresh token with 401', async () => {
    const user = await createActiveUser('revokedrt@example.com');
    const rawToken = 'revoked-raw-token-value';
    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      revokedAt: new Date(),
    });

    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: rawToken });
    expect(res.statusCode).toBe(401);
  });

  itDb('rejects an unknown refresh token with 401', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refresh_token: 'never-issued-token' });
    expect(res.statusCode).toBe(401);
  });

  itDb('rejects a well-formed but missing refresh_token field with 422', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.statusCode).toBe(422);
  });
});

describe('POST /api/auth/logout', () => {
  itDb('revokes the refresh token so it can no longer be used to refresh', async () => {
    const user = await createActiveUser('logoutuser@example.com');
    const { refreshToken } = await loginAndGetTokens(user.email);

    const logoutRes = await request(app).post('/api/auth/logout').send({ refresh_token: refreshToken });
    expect(logoutRes.statusCode).toBe(200);

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refresh_token: refreshToken });
    expect(refreshRes.statusCode).toBe(401);
  });

  itDb('responds successfully even for an already-invalid token (idempotent)', async () => {
    const res = await request(app).post('/api/auth/logout').send({ refresh_token: 'not-a-real-token' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
