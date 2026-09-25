const request = require('supertest');

const app = require('../../src/app');
const { sequelize, User, Role } = require('../../src/models');
const { hashPassword } = require('../../src/modules/auth/password.service');
const { isDbAvailable, seedRbac, resetAuthTables, itIfDb } = require('../helpers/testDb');

let dbReady = false;
const itDb = itIfDb(() => dbReady);

const PASSWORD = 'Password123';

const createUser = async ({ email, status = 'ACTIVE' }) => {
  const passwordHash = await hashPassword(PASSWORD);
  const user = await User.create({ email, passwordHash, firstName: 'Test', lastName: 'User', status });
  const role = await Role.findOne({ where: { name: 'STUDENT' } });
  await user.addRole(role);
  await user.reload(); // DB-backed defaults (lastLoginAt: NULL) rather than in-memory undefined
  return user;
};

beforeAll(async () => {
  dbReady = await isDbAvailable();
  if (dbReady) await seedRbac();
});

beforeEach(async () => {
  if (dbReady) await resetAuthTables();
});

afterAll(async () => sequelize.close());

describe('POST /api/auth/login', () => {
  itDb('logs in with valid credentials and returns tokens + user + roles', async () => {
    await createUser({ email: 'active@example.com' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'active@example.com', password: PASSWORD });

    expect(res.statusCode).toBe(200);
    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.refresh_token).toEqual(expect.any(String));
    expect(res.body.token_type).toBe('Bearer');
    expect(res.body.user.roles).toEqual(['STUDENT']);
    expect(res.body).not.toHaveProperty('password_hash');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  itDb('updates last_login_at only after a successful login', async () => {
    const user = await createUser({ email: 'trackme@example.com' });
    expect(user.lastLoginAt).toBeNull();

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'trackme@example.com', password: 'WrongPassword1' });
    await user.reload();
    expect(user.lastLoginAt).toBeNull();

    await request(app).post('/api/auth/login').send({ email: 'trackme@example.com', password: PASSWORD });
    await user.reload();
    expect(user.lastLoginAt).not.toBeNull();
  });

  itDb('rejects an unknown email with a generic 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  itDb('rejects a wrong password with the SAME generic 401 (no enumeration)', async () => {
    await createUser({ email: 'active2@example.com' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'active2@example.com', password: 'WrongPassword1' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  itDb('rejects a SUSPENDED user with 403 (after the password already checked out)', async () => {
    await createUser({ email: 'suspended@example.com', status: 'SUSPENDED' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'suspended@example.com', password: PASSWORD });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  itDb('rejects a DEACTIVATED user with 403', async () => {
    await createUser({ email: 'deactivated@example.com', status: 'DEACTIVATED' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'deactivated@example.com', password: PASSWORD });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  itDb('allows a PENDING (unverified) user to log in', async () => {
    await createUser({ email: 'pending@example.com', status: 'PENDING' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pending@example.com', password: PASSWORD });

    expect(res.statusCode).toBe(200);
  });
});
