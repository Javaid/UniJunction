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

const adminToken = async () => {
  await createUserWithRole('roleadmin@example.com', 'SUPER_ADMIN');
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'roleadmin@example.com', password: 'Password123' });
  return res.body.access_token;
};

describe('POST /api/admin/users/:userId/roles', () => {
  itDb('assigns a new role to a user', async () => {
    const target = await createUserWithRole('assignee@example.com', 'STUDENT');
    const token = await adminToken();

    const res = await request(app)
      .post(`/api/admin/users/${target.uuid}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'RESEARCHER' });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.roles.sort()).toEqual(['RESEARCHER', 'STUDENT']);
  });

  itDb('rejects a duplicate role assignment with 409', async () => {
    const target = await createUserWithRole('dup@example.com', 'STUDENT');
    const token = await adminToken();

    const res = await request(app)
      .post(`/api/admin/users/${target.uuid}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'STUDENT' });

    expect(res.statusCode).toBe(409);
  });

  itDb('rejects an unknown role name with 404', async () => {
    const target = await createUserWithRole('unknownrole@example.com', 'STUDENT');
    const token = await adminToken();

    const res = await request(app)
      .post(`/api/admin/users/${target.uuid}/roles`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'NOT_A_REAL_ROLE' });

    expect(res.statusCode).toBe(404);
  });

  itDb('rejects an unknown user with 404', async () => {
    const token = await adminToken();

    const res = await request(app)
      .post('/api/admin/users/00000000-0000-4000-8000-000000000000/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'STUDENT' });

    expect(res.statusCode).toBe(404);
  });

  itDb('rejects a normal STUDENT trying to assign a role to themselves', async () => {
    const target = await createUserWithRole('selfpromote@example.com', 'STUDENT');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'selfpromote@example.com', password: 'Password123' });

    const attempt = await request(app)
      .post(`/api/admin/users/${target.uuid}/roles`)
      .set('Authorization', `Bearer ${res.body.access_token}`)
      .send({ role: 'SUPER_ADMIN' });

    expect(attempt.statusCode).toBe(403);
  });
});

describe('DELETE /api/admin/users/:userId/roles/:role', () => {
  itDb('removes a role, leaving the remaining one(s) intact', async () => {
    const target = await createUserWithRole('twoRoles@example.com', 'STUDENT');
    const facultyRole = await Role.findOne({ where: { name: 'FACULTY' } });
    await target.addRole(facultyRole);
    const token = await adminToken();

    const res = await request(app)
      .delete(`/api/admin/users/${target.uuid}/roles/STUDENT`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.roles).toEqual(['FACULTY']);
  });

  itDb("refuses to remove a user's only remaining role", async () => {
    const target = await createUserWithRole('onlyrole@example.com', 'STUDENT');
    const token = await adminToken();

    const res = await request(app)
      .delete(`/api/admin/users/${target.uuid}/roles/STUDENT`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(409);
  });

  itDb("404s when the user doesn't have the named role", async () => {
    const target = await createUserWithRole('noresearcher@example.com', 'STUDENT');
    const token = await adminToken();

    const res = await request(app)
      .delete(`/api/admin/users/${target.uuid}/roles/RESEARCHER`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });
});
