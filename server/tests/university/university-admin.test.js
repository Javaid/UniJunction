const request = require('supertest');

const app = require('../../src/app');
const { sequelize, UniversityMembership } = require('../../src/models');
const { isDbAvailable, seedRbac, resetAuthTables, resetInstitutionTables, itIfDb } = require('../helpers/testDb');
const {
  createSuperAdmin,
  createUniversityAdmin,
  createUserWithRole,
  loginToken,
  createUniversity,
} = require('../helpers/institutionFixtures');

let dbReady = false;
const itDb = itIfDb(() => dbReady);

beforeAll(async () => {
  dbReady = await isDbAvailable();
  if (dbReady) await seedRbac();
});

beforeEach(async () => {
  if (dbReady) {
    await resetInstitutionTables();
    await resetAuthTables();
  }
});

afterAll(async () => sequelize.close());

describe('POST /api/admin/universities/:universityId/admins', () => {
  itDb('SUPER_ADMIN assigns a university administrator', async () => {
    const university = await createUniversity();
    const target = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: target.uuid });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.roles).toContain('UNIVERSITY_ADMIN');

    const membership = await UniversityMembership.findOne({
      where: { userId: target.id, universityId: university.id, membershipType: 'ADMIN' },
    });
    expect(membership).not.toBeNull();
    expect(membership.status).toBe('ACTIVE');
  });

  itDb('is idempotent — assigning twice does not duplicate the role or membership', async () => {
    const university = await createUniversity();
    const target = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();

    await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: target.uuid });
    const res = await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: target.uuid });

    expect(res.statusCode).toBe(201);
    const memberships = await UniversityMembership.findAll({
      where: { userId: target.id, universityId: university.id, membershipType: 'ADMIN' },
    });
    expect(memberships).toHaveLength(1);
  });

  itDb('rejects assigning a SUSPENDED user (409)', async () => {
    const university = await createUniversity();
    const target = await createUserWithRole('STUDENT', { status: 'SUSPENDED' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: target.uuid });

    expect(res.statusCode).toBe(409);
  });

  itDb('UNIVERSITY_ADMIN cannot assign an admin, not even for their own university (SUPER_ADMIN only)', async () => {
    const university = await createUniversity();
    const target = await createUserWithRole('STUDENT');
    const { token } = await createUniversityAdmin(university);

    const res = await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: target.uuid });

    expect(res.statusCode).toBe(403);
  });

  itDb('UNIVERSITY_ADMIN cannot assign themselves as admin of a DIFFERENT university', async () => {
    const ownUniversity = await createUniversity({ slug: 'selfpromote-own' });
    const otherUniversity = await createUniversity({ slug: 'selfpromote-other' });
    const { user, token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .post(`/api/admin/universities/${otherUniversity.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user.uuid });

    expect(res.statusCode).toBe(403);
  });

  itDb('STUDENT cannot assign an admin (403)', async () => {
    const university = await createUniversity();
    const target = await createUserWithRole('STUDENT');
    const student = await createUserWithRole('STUDENT');
    const token = await loginToken(student.email);

    const res = await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: target.uuid });

    expect(res.statusCode).toBe(403);
  });

  itDb('404s for an unknown target user', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: '00000000-0000-4000-8000-000000000000' });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/admin/universities/:universityId/admins', () => {
  itDb("SUPER_ADMIN can list any university's admins", async () => {
    const university = await createUniversity();
    const target = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();
    await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: target.uuid });

    const res = await request(app)
      .get(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].roles).toContain('UNIVERSITY_ADMIN');
  });

  itDb('UNIVERSITY_ADMIN can list admins of their OWN university', async () => {
    const university = await createUniversity();
    const { token } = await createUniversityAdmin(university);

    const res = await request(app)
      .get(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  itDb('UNIVERSITY_ADMIN cannot enumerate admins of an unrelated university (403)', async () => {
    const ownUniversity = await createUniversity({ slug: 'list-admins-own' });
    const otherUniversity = await createUniversity({ slug: 'list-admins-other' });
    const { token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .get(`/api/admin/universities/${otherUniversity.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});
