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

describe('GET /api/research-areas (catalog, hierarchical)', () => {
  itDb('lists the flat catalog with each row\'s parent_id', async () => {
    const { aiArea, mlArea } = await seedCatalogSample();

    const res = await request(app).get('/api/research-areas');
    expect(res.statusCode).toBe(200);
    const ml = res.body.data.find((a) => a.id === mlArea.uuid);
    expect(ml.parent_id).toBe(aiArea.uuid);
  });

  itDb('supports filtering to the direct children of a parent', async () => {
    const { aiArea, mlArea } = await seedCatalogSample();

    const res = await request(app).get('/api/research-areas').query({ parent_id: aiArea.uuid });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.map((a) => a.id)).toContain(mlArea.uuid);
    expect(res.body.data.map((a) => a.id)).not.toContain(aiArea.uuid);
  });
});

describe('Student research-interest management', () => {
  itDb('adds a research interest to the profile', async () => {
    const { mlArea } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/research-interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ research_area_id: mlArea.uuid, interest_level: 'ACTIVE' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBe(mlArea.uuid);
    expect(res.body.data.interest_level).toBe('ACTIVE');
    expect(res.body.data.parent_id).not.toBeNull();
  });

  itDb('rejects a duplicate research interest (409)', async () => {
    const { mlArea } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    await request(app)
      .post('/api/students/me/research-interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ research_area_id: mlArea.uuid });

    const res = await request(app)
      .post('/api/students/me/research-interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ research_area_id: mlArea.uuid });

    expect(res.statusCode).toBe(409);
  });

  itDb('removes a research interest from the profile', async () => {
    const { mlArea } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();
    await request(app)
      .post('/api/students/me/research-interests')
      .set('Authorization', `Bearer ${token}`)
      .send({ research_area_id: mlArea.uuid });

    const res = await request(app)
      .delete(`/api/students/me/research-interests/${mlArea.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(204);

    const profileRes = await request(app).get('/api/students/me/profile').set('Authorization', `Bearer ${token}`);
    expect(profileRes.body.data.research_interests).toHaveLength(0);
  });
});
