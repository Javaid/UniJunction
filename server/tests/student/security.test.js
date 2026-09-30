/**
 * §52 "Security" — directly traceable checks, one describe block per
 * numbered concern, mirroring the pattern established in
 * tests/university/security.test.js (Chunk 04).
 */
const request = require('supertest');

const app = require('../../src/app');
const { sequelize } = require('../../src/models');
const {
  isDbAvailable,
  seedRbac,
  resetAuthTables,
  resetInstitutionTables,
  resetStudentProfileTables,
  itIfDb,
} = require('../helpers/testDb');
const {
  createUniversity: createUniversityFixture,
  createUniversityAdmin,
} = require('../helpers/institutionFixtures');
const { createStudentMember } = require('../helpers/studentFixtures');

let dbReady = false;
const itDb = itIfDb(() => dbReady);

const createUniversity = (overrides = {}) => createUniversityFixture({ status: 'ACTIVE', ...overrides });

beforeAll(async () => {
  dbReady = await isDbAvailable();
  if (dbReady) await seedRbac();
});

beforeEach(async () => {
  if (dbReady) {
    await resetStudentProfileTables();
    await resetInstitutionTables();
    await resetAuthTables();
  }
});

afterAll(async () => sequelize.close());

describe('1. Student identifier is never exposed publicly', () => {
  itDb('a PUBLIC profile response never includes student_identifier', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);
    const createRes = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, student_identifier: 'SECRET-ID-001', profile_visibility: 'PUBLIC' });
    const profileId = createRes.body.data.id;

    const res = await request(app).get(`/api/students/${profileId}/profile`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.student_identifier).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('SECRET-ID-001');
  });

  itDb('an ordinary authenticated (non-owner, non-admin) viewer never sees student_identifier', async () => {
    const university = await createUniversity();
    const { token: ownerToken } = await createStudentMember(university);
    const createRes = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ university_id: university.uuid, student_identifier: 'SECRET-ID-002', profile_visibility: 'ACADEMIC_NETWORK' });
    const profileId = createRes.body.data.id;

    const { token: viewerToken } = await createStudentMember(await createUniversity({ slug: 'sec-viewer-u' }));
    const res = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.student_identifier).toBeUndefined();
  });

  itDb('the admin student-list endpoint never includes student_identifier', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, student_identifier: 'SECRET-ID-003' });
    const { token: adminToken } = await createUniversityAdmin(university);

    const res = await request(app)
      .get(`/api/universities/${university.uuid}/students`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('SECRET-ID-003');
  });
});

describe('2. Email and phone are never exposed via discovery', () => {
  itDb('the public profile response never includes email or phone', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university, { email: 'sensitive-email@example.com' });
    const createRes = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, profile_visibility: 'PUBLIC' });
    const profileId = createRes.body.data.id;

    const res = await request(app).get(`/api/students/${profileId}/profile`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBeUndefined();
    expect(res.body.data.user.phone).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('sensitive-email@example.com');
  });
});

describe('3. Unauthorized users cannot modify a profile', () => {
  itDb('an unauthenticated request cannot update a profile (401)', async () => {
    const res = await request(app).put('/api/students/me/profile').send({ headline: 'Hijacked' });
    expect(res.statusCode).toBe(401);
  });

  itDb('one student cannot reach another student\'s "me" profile — /me always resolves to the caller', async () => {
    const university = await createUniversity();
    const { token: tokenA } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ university_id: university.uuid, headline: 'Student A' });

    const { token: tokenB } = await createStudentMember(university);
    const res = await request(app)
      .put('/api/students/me/profile')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ headline: 'Overwritten by B' });

    // B has no profile yet, so /me/profile PUT 404s — it can never
    // silently target A's row, because "me" is resolved from the
    // caller's own token, never a client-supplied id.
    expect(res.statusCode).toBe(404);

    const aProfile = await request(app).get('/api/students/me/profile').set('Authorization', `Bearer ${tokenA}`);
    expect(aProfile.body.data.headline).toBe('Student A');
  });

  itDb('a FACULTY member cannot create a student profile without an active student context (403)', async () => {
    const { createUserWithRole, loginToken } = require('../helpers/institutionFixtures');
    const university = await createUniversity();
    const facultyUser = await createUserWithRole('FACULTY');
    const token = await loginToken(facultyUser.email);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    expect(res.statusCode).toBe(403);
  });
});

describe('4. Cross-university access respects visibility', () => {
  itDb("a UNIVERSITY_ADMIN of a DIFFERENT university cannot see a UNIVERSITY_ONLY profile", async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);
    const createRes = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, profile_visibility: 'UNIVERSITY_ONLY' });
    const profileId = createRes.body.data.id;

    const otherUniversity = await createUniversity({ slug: 'sec-cross-u' });
    const { token: otherAdminToken } = await createUniversityAdmin(otherUniversity);

    const res = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${otherAdminToken}`);

    expect(res.statusCode).toBe(404);
  });

  itDb('a student cannot add a skill to another student\'s profile by any means (skills are always resolved from the caller\'s own profile)', async () => {
    const { Skill } = require('../../src/models');
    const skill = await Skill.create({ name: `Sec Skill ${Date.now()}`, slug: `sec-skill-${Date.now()}`, category: 'OTHER' });

    const university = await createUniversity();
    const { token: tokenA } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ university_id: university.uuid });

    const { token: tokenB } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ university_id: university.uuid });

    const res = await request(app)
      .post('/api/students/me/skills')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ skill_id: skill.uuid });
    expect(res.statusCode).toBe(201);

    const profileA = await request(app).get('/api/students/me/profile').set('Authorization', `Bearer ${tokenA}`);
    expect(profileA.body.data.skills).toHaveLength(0);
  });
});
