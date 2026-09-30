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

const createStudentWithProfile = async () => {
  const university = await createUniversity();
  const { token } = await createStudentMember(university);
  await request(app).post('/api/students/me/profile').set('Authorization', `Bearer ${token}`).send({
    university_id: university.uuid,
  });
  return { university, token };
};

describe('Student achievements', () => {
  itDb('creates an achievement', async () => {
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/achievements')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hackathon Winner', organization: 'HackMIT', achievement_date: '2024-03-01' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.title).toBe('Hackathon Winner');
  });

  itDb('rejects a malformed url (422)', async () => {
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/achievements')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad URL Achievement', url: 'not-a-url' });

    expect(res.statusCode).toBe(422);
  });

  itDb('lists, updates, and deletes an achievement', async () => {
    const { token } = await createStudentWithProfile();
    const createRes = await request(app)
      .post('/api/students/me/achievements')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Achievement A' });
    const id = createRes.body.data.id;

    const listRes = await request(app).get('/api/students/me/achievements').set('Authorization', `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/students/me/achievements/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Achievement A Updated' });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.title).toBe('Achievement A Updated');

    const deleteRes = await request(app)
      .delete(`/api/students/me/achievements/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.statusCode).toBe(204);
  });

  itDb('a student cannot access another student\'s achievement (404)', async () => {
    const { token: tokenA } = await createStudentWithProfile();
    const { token: tokenB } = await createStudentWithProfile();
    const createRes = await request(app)
      .post('/api/students/me/achievements')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Private Achievement' });
    const id = createRes.body.data.id;

    const res = await request(app)
      .delete(`/api/students/me/achievements/${id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.statusCode).toBe(404);
  });
});
