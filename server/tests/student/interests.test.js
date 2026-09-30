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
const { createUniversity: createUniversityFixture } = require('../helpers/institutionFixtures');
const { createStudentMember, seedCatalogSample } = require('../helpers/studentFixtures');

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

const createStudentWithProfile = async () => {
  const university = await createUniversity();
  const { token } = await createStudentMember(university);
  await request(app).post('/api/students/me/profile').set('Authorization', `Bearer ${token}`).send({
    university_id: university.uuid,
  });
  return { university, token };
};

describe('GET /api/interests (catalog)', () => {
  itDb('lists ACTIVE interests, supports search', async () => {
    const { ai } = await seedCatalogSample();

    const res = await request(app).get('/api/interests').query({ search: ai.name });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.some((i) => i.id === ai.uuid)).toBe(true);
  });
});

describe('Student interest management', () => {
  itDb('adds an interest to the profile', async () => {
    const { ai } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ interest_id: ai.uuid });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBe(ai.uuid);
  });

  itDb('rejects a duplicate interest (409)', async () => {
    const { ai } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    await request(app)
      .post('/api/students/me/interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ interest_id: ai.uuid });

    const res = await request(app)
      .post('/api/students/me/interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ interest_id: ai.uuid });

    expect(res.statusCode).toBe(409);
  });

  itDb('removes an interest from the profile', async () => {
    const { ai } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();
    await request(app)
      .post('/api/students/me/interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ interest_id: ai.uuid });

    const res = await request(app)
      .delete(`/api/students/me/interests/${ai.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(204);

    const profileRes = await request(app).get('/api/students/me/profile').set('Authorization', `Bearer ${token}`);
    expect(profileRes.body.data.interests).toHaveLength(0);
  });

  itDb('404s when removing an interest never added', async () => {
    const { ai } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .delete(`/api/students/me/interests/${ai.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});
