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

describe('GET /api/languages (catalog)', () => {
  itDb('lists ACTIVE languages', async () => {
    const { english } = await seedCatalogSample();

    const res = await request(app).get('/api/languages');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.some((l) => l.id === english.uuid)).toBe(true);
  });
});

describe('Student language management', () => {
  itDb('adds a language to the profile', async () => {
    const { english } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/languages')
      .set('Authorization', `Bearer ${token}`)
      .send({ language_id: english.uuid, proficiency_level: 'NATIVE' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.proficiency_level).toBe('NATIVE');
  });

  itDb('rejects a duplicate language (409)', async () => {
    const { english } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    await request(app)
      .post('/api/students/me/languages')
      .set('Authorization', `Bearer ${token}`)
      .send({ language_id: english.uuid });

    const res = await request(app)
      .post('/api/students/me/languages')
      .set('Authorization', `Bearer ${token}`)
      .send({ language_id: english.uuid });

    expect(res.statusCode).toBe(409);
  });

  itDb('updates proficiency for an existing language', async () => {
    const { spanish } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();
    await request(app)
      .post('/api/students/me/languages')
      .set('Authorization', `Bearer ${token}`)
      .send({ language_id: spanish.uuid, proficiency_level: 'BASIC' });

    const res = await request(app)
      .put(`/api/students/me/languages/${spanish.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ proficiency_level: 'FLUENT' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.proficiency_level).toBe('FLUENT');
  });

  itDb('removes a language from the profile', async () => {
    const { english } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();
    await request(app)
      .post('/api/students/me/languages')
      .set('Authorization', `Bearer ${token}`)
      .send({ language_id: english.uuid });

    const res = await request(app)
      .delete(`/api/students/me/languages/${english.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(204);
  });
});
