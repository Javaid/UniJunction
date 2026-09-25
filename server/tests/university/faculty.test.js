const request = require('supertest');

const app = require('../../src/app');
const { sequelize, Faculty } = require('../../src/models');
const { isDbAvailable, seedRbac, resetAuthTables, resetInstitutionTables, itIfDb } = require('../helpers/testDb');
const { createSuperAdmin, createUniversityAdmin, createUniversity } = require('../helpers/institutionFixtures');

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

describe('Faculty CRUD', () => {
  itDb('creates a faculty under a university', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/faculties`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Faculty of Science' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.university_id).toBe(university.uuid);
    expect(res.body.data.name).toBe('Faculty of Science');
  });

  itDb('lists faculties for a university, publicly', async () => {
    const university = await createUniversity();
    await Faculty.create({ universityId: university.id, name: 'Faculty A' });
    await Faculty.create({ universityId: university.id, name: 'Faculty B' });

    const res = await request(app).get(`/api/universities/${university.uuid}/faculties`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  itDb('updates a faculty via its flat id', async () => {
    const university = await createUniversity();
    const faculty = await Faculty.create({ universityId: university.id, name: 'Old Name' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .put(`/api/faculties/${faculty.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('New Name');
  });

  itDb('changes faculty status', async () => {
    const university = await createUniversity();
    const faculty = await Faculty.create({ universityId: university.id, name: 'F' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .patch(`/api/faculties/${faculty.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  itDb('UNIVERSITY_ADMIN can manage their own university faculty', async () => {
    const university = await createUniversity();
    const { token } = await createUniversityAdmin(university);

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/faculties`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Own Faculty' });

    expect(res.statusCode).toBe(201);
  });

  itDb('UNIVERSITY_ADMIN cannot create a faculty under another university (ownership enforced)', async () => {
    const ownUniversity = await createUniversity({ slug: 'own-fac-u' });
    const otherUniversity = await createUniversity({ slug: 'other-fac-u' });
    const { token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .post(`/api/universities/${otherUniversity.uuid}/faculties`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sneaky Faculty' });

    expect(res.statusCode).toBe(403);
  });

  itDb('UNIVERSITY_ADMIN cannot update another university\'s faculty via the flat endpoint', async () => {
    const ownUniversity = await createUniversity({ slug: 'own-fac-u2' });
    const otherUniversity = await createUniversity({ slug: 'other-fac-u2' });
    const otherFaculty = await Faculty.create({ universityId: otherUniversity.id, name: 'Other Faculty' });
    const { token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .put(`/api/faculties/${otherFaculty.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hacked' });

    expect(res.statusCode).toBe(403);
  });

  itDb('ignores a university reassignment attempt (no university_id field accepted)', async () => {
    const university = await createUniversity();
    const otherUniversity = await createUniversity({ slug: 'other-u-reassign' });
    const faculty = await Faculty.create({ universityId: university.id, name: 'F' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .put(`/api/faculties/${faculty.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: otherUniversity.uuid, name: 'Still Same Uni' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.university_id).toBe(university.uuid);
  });

  itDb('404s for an unknown faculty id', async () => {
    const res = await request(app).get('/api/faculties/00000000-0000-4000-8000-000000000000');
    expect(res.statusCode).toBe(404);
  });
});
