const jwt = require('jsonwebtoken');
const request = require('supertest');

const app = require('../../src/app');
const env = require('../../src/config/env');
const { sequelize, User, Role } = require('../../src/models');
const { hashPassword } = require('../../src/modules/auth/password.service');
const { signAccessToken } = require('../../src/modules/auth/token.service');
const { isDbAvailable, seedRbac, resetAuthTables, itIfDb } = require('../helpers/testDb');

let dbReady = false;
const itDb = itIfDb(() => dbReady);

beforeAll(async () => {
  dbReady = await isDbAvailable();
  if (dbReady) await seedRbac();
});

beforeEach(async () => {
  if (dbReady) await resetAuthTables();
});

afterAll(async () => sequelize.close());

const createActiveUser = async (email = 'jwtuser@example.com') => {
  const passwordHash = await hashPassword('Password123');
  const user = await User.create({ email, passwordHash, firstName: 'JWT', lastName: 'User', status: 'ACTIVE' });
  const role = await Role.findOne({ where: { name: 'STUDENT' } });
  await user.addRole(role);
  return user;
};

describe('GET /api/auth/me (requireAuth)', () => {
  itDb('returns the current user for a valid token', async () => {
    const user = await createActiveUser();
    const { token } = signAccessToken(user);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('jwtuser@example.com');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  itDb('rejects a missing Authorization header with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication required.');
  });

  itDb('rejects a malformed Authorization header with 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'NotBearer sometoken');
    expect(res.statusCode).toBe(401);
  });

  itDb('rejects an invalid/garbage token with 401 and no internal details', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication required.');
    expect(JSON.stringify(res.body)).not.toMatch(/secret|jsonwebtoken|jwt malformed/i);
  });

  itDb('rejects an expired token with 401', async () => {
    const user = await createActiveUser('expired@example.com');
    const expiredToken = jwt.sign({ sub: user.uuid, type: 'access' }, env.jwt.accessSecret, {
      expiresIn: '-10s',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.statusCode).toBe(401);
  });

  itDb('rejects a token signed with the wrong secret with 401', async () => {
    const user = await createActiveUser('wrongsecret@example.com');
    const badToken = jwt.sign({ sub: user.uuid, type: 'access' }, 'a-completely-different-secret', {
      expiresIn: '15m',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${badToken}`);
    expect(res.statusCode).toBe(401);
  });

  itDb('rejects a token whose subject does not resolve to any user', async () => {
    const ghostToken = jwt.sign(
      { sub: '00000000-0000-4000-8000-000000000000', type: 'access' },
      env.jwt.accessSecret,
      { expiresIn: '15m' }
    );

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ghostToken}`);
    expect(res.statusCode).toBe(401);
  });

  itDb('rejects a SUSPENDED user even with an otherwise-valid token', async () => {
    const user = await createActiveUser('suspendedjwt@example.com');
    const { token } = signAccessToken(user);
    await user.update({ status: 'SUSPENDED' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(401);
  });
});
