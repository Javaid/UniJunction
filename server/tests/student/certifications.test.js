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

describe('Student certifications', () => {
  itDb('creates a certification', async () => {
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'AWS Certified Cloud Practitioner',
        issuing_organization: 'Amazon Web Services',
        issue_date: '2024-01-15',
        expiry_date: '2027-01-15',
        credential_url: 'https://example.com/credential/123',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe('AWS Certified Cloud Practitioner');
  });

  itDb('rejects an expiry_date earlier than issue_date (422)', async () => {
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Dates Cert', issue_date: '2024-01-15', expiry_date: '2023-01-15' });

    expect(res.statusCode).toBe(422);
  });

  itDb('rejects a malformed credential_url (422)', async () => {
    const { token } = await createStudentWithProfile();

    const res = await request(app)
      .post('/api/students/me/certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad URL Cert', credential_url: 'not-a-url' });

    expect(res.statusCode).toBe(422);
  });

  itDb('lists, updates, and deletes a certification', async () => {
    const { token } = await createStudentWithProfile();
    const createRes = await request(app)
      .post('/api/students/me/certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cert A', issue_date: '2024-01-01' });
    const id = createRes.body.data.id;

    const listRes = await request(app).get('/api/students/me/certifications').set('Authorization', `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/students/me/certifications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cert A Updated' });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.name).toBe('Cert A Updated');

    const deleteRes = await request(app)
      .delete(`/api/students/me/certifications/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.statusCode).toBe(204);

    const afterDelete = await request(app)
      .get('/api/students/me/certifications')
      .set('Authorization', `Bearer ${token}`);
    expect(afterDelete.body.data).toHaveLength(0);
  });

  itDb('rejects an update that would move expiry_date before the persisted issue_date (422)', async () => {
    const { token } = await createStudentWithProfile();
    const createRes = await request(app)
      .post('/api/students/me/certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cert B', issue_date: '2024-06-01' });
    const id = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/students/me/certifications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expiry_date: '2024-01-01' });

    expect(res.statusCode).toBe(422);
  });

  itDb('a student cannot access another student\'s certification (404)', async () => {
    const { token: tokenA } = await createStudentWithProfile();
    const { token: tokenB } = await createStudentWithProfile();
    const createRes = await request(app)
      .post('/api/students/me/certifications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Private Cert' });
    const id = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/students/me/certifications/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hijacked' });

    expect(res.statusCode).toBe(404);
  });
});
