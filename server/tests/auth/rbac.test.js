const request = require('supertest');

const app = require('../../src/app');
const { sequelize, User, Role } = require('../../src/models');
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

const createUserWithRole = async (email, roleName) => {
  const passwordHash = await hashPassword('Password123');
  const user = await User.create({ email, passwordHash, firstName: 'R', lastName: 'User', status: 'ACTIVE' });
  const role = await Role.findOne({ where: { name: roleName } });
  await user.addRole(role);
  return user;
};

const loginToken = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return res.body.access_token;
};

describe('Authorization: 401 vs 403', () => {
  itDb('no Authorization header -> 401 on a permission-gated route', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.statusCode).toBe(401);
  });

  itDb('authenticated but missing the required permission -> 403', async () => {
    // ROLE_ASSIGN is only on SUPER_ADMIN in the initial mapping (§21);
    // STUDENT lacks it, so this must be forbidden, not merely rejected.
    await createUserWithRole('nopermission@example.com', 'STUDENT');
    const token = await loginToken('nopermission@example.com');

    const res = await request(app)
      .post('/api/admin/users/00000000-0000-4000-8000-000000000000/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'FACULTY' });

    expect(res.statusCode).toBe(403);
  });

  itDb('authenticated with the required permission -> success', async () => {
    const target = await createUserWithRole('target@example.com', 'STUDENT');
    await createUserWithRole('superadmin@example.com', 'SUPER_ADMIN');
    const token = await loginToken('superadmin@example.com');

    const res = await request(app)
      .post(`/api/admin/users/${target.uuid}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'FACULTY' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/admin/users', () => {
  itDb('paginates and returns users without password_hash', async () => {
    await createUserWithRole('admin@example.com', 'SUPER_ADMIN');
    await createUserWithRole('u2@example.com', 'STUDENT');
    await createUserWithRole('u3@example.com', 'STUDENT');
    const token = await loginToken('admin@example.com');

    const res = await request(app)
      .get('/api/admin/users')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3 });
    res.body.data.forEach((user) => expect(user).not.toHaveProperty('password_hash'));
  });

  itDb('filters by status', async () => {
    await createUserWithRole('admin2@example.com', 'SUPER_ADMIN');
    const suspended = await createUserWithRole('suspendeduser@example.com', 'STUDENT');
    await suspended.update({ status: 'SUSPENDED' });
    const token = await loginToken('admin2@example.com');

    const res = await request(app)
      .get('/api/admin/users')
      .query({ status: 'SUSPENDED' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('suspendeduser@example.com');
  });
});
