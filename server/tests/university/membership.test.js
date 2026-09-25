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

describe('University memberships', () => {
  itDb('creates a membership for a user', async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT', status: 'ACTIVE' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.membership_type).toBe('STUDENT');
    expect(res.body.data.user.id).toBe(student.uuid);
  });

  itDb('rejects a duplicate (user, university, membership_type) with 409', async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();

    await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT' });

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT' });

    expect(res.statusCode).toBe(409);
  });

  itDb('enforces at most one primary membership per user, across universities', async () => {
    const universityA = await createUniversity({ slug: 'member-uni-a' });
    const universityB = await createUniversity({ slug: 'member-uni-b' });
    const student = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();

    await request(app)
      .post(`/api/universities/${universityA.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT', is_primary: true });

    await request(app)
      .post(`/api/universities/${universityB.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'RESEARCHER', is_primary: true });

    const memberships = await UniversityMembership.findAll({ where: { userId: student.id } });
    const primaryCount = memberships.filter((m) => m.isPrimary).length;
    expect(primaryCount).toBe(1);
    expect(memberships.find((m) => m.universityId === universityB.id).isPrimary).toBe(true);
  });

  itDb('lists memberships for a university (admin-level, not public)', async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();
    await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT' });

    const res = await request(app)
      .get(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const publicRes = await request(app).get(`/api/universities/${university.uuid}/members`);
    expect(publicRes.statusCode).toBe(401);
  });

  itDb('updates a membership status and sets left_at when ENDED', async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();
    const created = await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT', status: 'ACTIVE' });

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/members/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ENDED' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('ENDED');
    expect(res.body.data.left_at).not.toBeNull();
  });

  itDb('rejects a cross-university membership id (membership belongs elsewhere) with 404', async () => {
    const universityA = await createUniversity({ slug: 'member-cross-a' });
    const universityB = await createUniversity({ slug: 'member-cross-b' });
    const student = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();
    const created = await request(app)
      .post(`/api/universities/${universityB.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT' });

    const res = await request(app)
      .patch(`/api/universities/${universityA.uuid}/members/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SUSPENDED' });

    expect(res.statusCode).toBe(404);
  });

  itDb("UNIVERSITY_ADMIN cannot manage another university's memberships (ownership enforced)", async () => {
    const ownUniversity = await createUniversity({ slug: 'member-own-u' });
    const otherUniversity = await createUniversity({ slug: 'member-other-u' });
    const student = await createUserWithRole('STUDENT');
    const { token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .post(`/api/universities/${otherUniversity.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT' });

    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/users/me/universities and /api/users/:userId/universities', () => {
  itDb("returns the caller's own memberships, including non-active ones", async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const studentToken = await loginToken(student.email);
    const { token: adminToken } = await createSuperAdmin();

    await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: student.uuid, membership_type: 'RESEARCHER', status: 'PENDING' });

    const res = await request(app).get('/api/users/me/universities').set('Authorization', `Bearer ${studentToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('PENDING');
  });

  itDb('returns only ACTIVE memberships for another user (limited public view)', async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const { token: adminToken } = await createSuperAdmin();
    const viewerToken = await loginToken((await createUserWithRole('STUDENT')).email);

    await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT', status: 'PENDING' });

    const res = await request(app)
      .get(`/api/users/${student.uuid}/universities`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0); // PENDING is not ACTIVE — hidden from this limited view
  });

  itDb('requires authentication', async () => {
    const res = await request(app).get('/api/users/me/universities');
    expect(res.statusCode).toBe(401);
  });
});
