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

describe('Student academic goals', () => {
  itDb('creates a goal, defaulting status to ACTIVE', async () => {
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal_type: 'RESEARCH', title: 'Publish a paper' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  itDb('rejects an invalid goal_type (422)', async () => {
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal_type: 'NOT_A_GOAL_TYPE', title: 'Invalid goal' });

    expect(res.statusCode).toBe(422);
  });

  itDb('lists, updates, and deletes a goal', async () => {
    const { token } = await createStudentWithProfile();
    const createRes = await request(app)
      .post('/api/students/me/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal_type: 'MENTORSHIP', title: 'Find a mentor' });
    const id = createRes.body.data.id;

    const listRes = await request(app).get('/api/students/me/goals').set('Authorization', `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/students/me/goals/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Find a research mentor' });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.title).toBe('Find a research mentor');

    const deleteRes = await request(app).delete(`/api/students/me/goals/${id}`).set('Authorization', `Bearer ${token}`);
    expect(deleteRes.statusCode).toBe(204);
  });

  itDb('changes goal status through COMPLETED/PAUSED/CANCELLED', async () => {
    const { token } = await createStudentWithProfile();
    const createRes = await request(app)
      .post('/api/students/me/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal_type: 'INTERNSHIP', title: 'Land a summer internship' });
    const id = createRes.body.data.id;

    for (const status of ['PAUSED', 'ACTIVE', 'COMPLETED']) {
      const res = await request(app)
        .put(`/api/students/me/goals/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe(status);
    }
  });

  itDb('a student cannot access another student\'s goal (404)', async () => {
    const { token: tokenA } = await createStudentWithProfile();
    const { token: tokenB } = await createStudentWithProfile();
    const createRes = await request(app)
      .post('/api/students/me/goals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ goal_type: 'CAREER', title: 'Private goal' });
    const id = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/students/me/goals/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'CANCELLED' });

    expect(res.statusCode).toBe(404);
  });
});
