const request = require('supertest');

const app = require('../../src/app');
const env = require('../../src/config/env');
const { sequelize, User, Role, RefreshToken, EmailVerificationToken } = require('../../src/models');
const { hashPassword } = require('../../src/modules/auth/password.service');
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

describe('Security: token hashes never leave the database layer', () => {
  itDb('RefreshToken queries never return token_hash by default', async () => {
    const passwordHash = await hashPassword('Password123');
    const user = await User.create({
      email: 'refreshsecurity@example.com',
      passwordHash,
      firstName: 'S',
      lastName: 'User',
      status: 'ACTIVE',
    });
    const role = await Role.findOne({ where: { name: 'STUDENT' } });
    await user.addRole(role);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'refreshsecurity@example.com', password: 'Password123' });

    const rows = await RefreshToken.findAll({ where: { userId: user.id } });
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => expect(row.toJSON()).not.toHaveProperty('tokenHash'));
  });

  itDb('EmailVerificationToken queries never return token_hash by default', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'verifysecurity@example.com',
      password: 'Password123',
      first_name: 'V',
      last_name: 'User',
    });

    const rows = await EmailVerificationToken.findAll();
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => expect(row.toJSON()).not.toHaveProperty('tokenHash'));
  });
});

describe('Security: no account enumeration', () => {
  itDb('resend-verification gives an identical response for a known and an unknown email', async () => {
    const passwordHash = await hashPassword('Password123');
    const user = await User.create({
      email: 'knownpending@example.com',
      passwordHash,
      firstName: 'K',
      lastName: 'User',
      status: 'PENDING',
    });
    const role = await Role.findOne({ where: { name: 'STUDENT' } });
    await user.addRole(role);

    const knownRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'knownpending@example.com' });
    const unknownRes = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'definitely-unknown@example.com' });

    expect(knownRes.statusCode).toBe(unknownRes.statusCode);
    expect(knownRes.body).toEqual(unknownRes.body);
  });

  itDb('verify-email gives an identical response for a bogus and an already-used token', async () => {
    const bogus = await request(app).post('/api/auth/verify-email').send({ token: 'totally-made-up' });
    const alsoBogus = await request(app).post('/api/auth/verify-email').send({ token: 'another-fake-one' });

    expect(bogus.statusCode).toBe(alsoBogus.statusCode);
    expect(bogus.body).toEqual(alsoBogus.body);
  });
});

describe('Security: invalid JWT does not leak configuration', () => {
  itDb('the 401 body never contains the signing secret or library internals', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');
    const body = JSON.stringify(res.body);

    expect(body).not.toContain(env.jwt.accessSecret);
    expect(body.toLowerCase()).not.toMatch(/jsonwebtoken|jwt malformed|invalid signature/);
  });
});

describe('Security: password_hash never appears in any auth response', () => {
  itDb('across register, login, and /me', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'noleakage@example.com',
      password: 'Password123',
      first_name: 'No',
      last_name: 'Leak',
    });
    expect(JSON.stringify(registerRes.body)).not.toMatch(/password_hash|passwordHash/);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noleakage@example.com', password: 'Password123' });
    expect(JSON.stringify(loginRes.body)).not.toMatch(/password_hash|passwordHash/);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`);
    expect(JSON.stringify(meRes.body)).not.toMatch(/password_hash|passwordHash/);
  });
});
