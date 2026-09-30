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

describe('GET /api/skills (catalog)', () => {
  itDb('lists ACTIVE skills, supports search', async () => {
    const { python } = await seedCatalogSample();

    const res = await request(app).get('/api/skills').query({ search: python.name });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.some((s) => s.id === python.uuid)).toBe(true);
  });
});

describe('Student skill management', () => {
  itDb('adds a skill to the profile', async () => {
    const { python } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skill_id: python.uuid, proficiency_level: 'ADVANCED', years_experience: 3 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.id).toBe(python.uuid);
    expect(res.body.data.proficiency_level).toBe('ADVANCED');
  });

  itDb('rejects a duplicate skill on the same profile (409)', async () => {
    const { python } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    await request(app)
      .post('/api/students/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skill_id: python.uuid });

    const res = await request(app)
      .post('/api/students/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skill_id: python.uuid });

    expect(res.statusCode).toBe(409);
  });

  itDb('updates proficiency for an existing skill', async () => {
    const { python } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();
    await request(app)
      .post('/api/students/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skill_id: python.uuid, proficiency_level: 'BEGINNER' });

    const res = await request(app)
      .put(`/api/students/me/skills/${python.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ proficiency_level: 'EXPERT', years_experience: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.proficiency_level).toBe('EXPERT');
  });

  itDb('removes a skill from the profile', async () => {
    const { python } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();
    await request(app)
      .post('/api/students/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skill_id: python.uuid });

    const res = await request(app)
      .delete(`/api/students/me/skills/${python.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(204);

    const profileRes = await request(app).get('/api/students/me/profile').set('Authorization', `Bearer ${token}`);
    expect(profileRes.body.data.skills).toHaveLength(0);
  });

  itDb('404s when removing a skill never added', async () => {
    const { python } = await seedCatalogSample();
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .delete(`/api/students/me/skills/${python.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  itDb('a student without a profile yet cannot add a skill (404)', async () => {
    const { python } = await seedCatalogSample();
    const university = await createUniversity();
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skill_id: python.uuid });

    expect(res.statusCode).toBe(404);
  });
});
