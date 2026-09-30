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
  createSuperAdmin,
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

/** Creates a profile with the given visibility and returns its public id + owning university/token. */
const createProfileWithVisibility = async (visibility) => {
  const university = await createUniversity();
  const { token, user } = await createStudentMember(university);
  const res = await request(app)
    .post('/api/students/me/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ university_id: university.uuid, profile_visibility: visibility, headline: 'Test headline' });
  return { profileId: res.body.data.id, university, ownerToken: token, ownerUser: user };
};

describe('§9/§26: profile visibility enforcement — every mode, every viewer context', () => {
  itDb('PUBLIC: visible to an anonymous (unauthenticated) viewer', async () => {
    const { profileId } = await createProfileWithVisibility('PUBLIC');

    const res = await request(app).get(`/api/students/${profileId}/profile`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.headline).toBe('Test headline');
  });

  itDb('ACADEMIC_NETWORK: denied to an anonymous viewer, visible to any authenticated user', async () => {
    const { profileId } = await createProfileWithVisibility('ACADEMIC_NETWORK');
    const otherUniversity = await createUniversity({ slug: 'vis-other-u' });
    const { token: otherToken } = await createStudentMember(otherUniversity);

    const anonRes = await request(app).get(`/api/students/${profileId}/profile`);
    expect(anonRes.statusCode).toBe(404);

    const authRes = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(authRes.statusCode).toBe(200);
  });

  itDb('UNIVERSITY_ONLY: denied to a student at a different university, visible to one at the same university', async () => {
    const { profileId, university } = await createProfileWithVisibility('UNIVERSITY_ONLY');
    const otherUniversity = await createUniversity({ slug: 'vis-uo-other-u' });
    const { token: outsiderToken } = await createStudentMember(otherUniversity);
    const { token: sameUniToken } = await createStudentMember(university);

    const outsiderRes = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(outsiderRes.statusCode).toBe(404);

    const sameUniRes = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${sameUniToken}`);
    expect(sameUniRes.statusCode).toBe(200);
  });

  itDb('CONNECTIONS_ONLY: conservatively denied to everyone but the owner and institutional admins (no Connections domain yet)', async () => {
    const { profileId, university } = await createProfileWithVisibility('CONNECTIONS_ONLY');
    const { token: sameUniToken } = await createStudentMember(university);

    const res = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${sameUniToken}`);
    expect(res.statusCode).toBe(404);
  });

  itDb('PRIVATE: denied to everyone but the owner and institutional admins', async () => {
    const { profileId, university } = await createProfileWithVisibility('PRIVATE');
    const { token: sameUniToken } = await createStudentMember(university);

    const res = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${sameUniToken}`);
    expect(res.statusCode).toBe(404);
  });

  itDb('the owner can always see their own profile regardless of visibility', async () => {
    const { profileId, ownerToken } = await createProfileWithVisibility('PRIVATE');

    const res = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.headline).toBe('Test headline');
  });

  itDb('§9/§41: SUPER_ADMIN always sees a PRIVATE profile (institutional oversight overrides visibility)', async () => {
    const { profileId } = await createProfileWithVisibility('PRIVATE');
    const { token: superAdminToken } = await createSuperAdmin();

    const res = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.statusCode).toBe(200);
  });

  itDb("§9/§41: the student's OWN UNIVERSITY_ADMIN always sees a PRIVATE profile", async () => {
    const { profileId, university } = await createProfileWithVisibility('PRIVATE');
    const { token: adminToken } = await createUniversityAdmin(university);

    const res = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
  });

  itDb("a DIFFERENT university's UNIVERSITY_ADMIN does NOT bypass a PRIVATE profile's visibility", async () => {
    const { profileId } = await createProfileWithVisibility('PRIVATE');
    const otherUniversity = await createUniversity({ slug: 'vis-admin-other-u' });
    const { token: otherAdminToken } = await createUniversityAdmin(otherUniversity);

    const res = await request(app)
      .get(`/api/students/${profileId}/profile`)
      .set('Authorization', `Bearer ${otherAdminToken}`);
    expect(res.statusCode).toBe(404);
  });
});
