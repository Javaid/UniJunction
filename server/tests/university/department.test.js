const request = require('supertest');

const app = require('../../src/app');
const { sequelize, Faculty, Department } = require('../../src/models');
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

describe('Department CRUD', () => {
  itDb('creates a department directly under a university (no faculty)', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/departments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Direct Department' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.faculty_id).toBeNull();
  });

  itDb('creates a department under a faculty of the same university', async () => {
    const university = await createUniversity();
    const faculty = await Faculty.create({ universityId: university.id, name: 'Faculty' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/departments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'CS Department', faculty_id: faculty.uuid });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.faculty_id).toBe(faculty.uuid);
  });

  itDb('rejects a faculty_id that belongs to a DIFFERENT university (400)', async () => {
    const university = await createUniversity();
    const otherUniversity = await createUniversity({ slug: 'dept-other-u' });
    const otherFaculty = await Faculty.create({ universityId: otherUniversity.id, name: 'Other Faculty' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/departments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cross Tenant Dept', faculty_id: otherFaculty.uuid });

    expect(res.statusCode).toBe(400);
  });

  itDb('updates a department via its flat id', async () => {
    const university = await createUniversity();
    const department = await Department.create({ universityId: university.id, name: 'Old' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .put(`/api/departments/${department.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('New');
  });

  itDb('changes department status', async () => {
    const university = await createUniversity();
    const department = await Department.create({ universityId: university.id, name: 'D' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .patch(`/api/departments/${department.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  itDb("UNIVERSITY_ADMIN cannot modify another university's department (ownership enforced)", async () => {
    const ownUniversity = await createUniversity({ slug: 'dept-own-u' });
    const otherUniversity = await createUniversity({ slug: 'dept-other-u2' });
    const otherDepartment = await Department.create({ universityId: otherUniversity.id, name: 'Other Dept' });
    const { token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .put(`/api/departments/${otherDepartment.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hacked' });

    expect(res.statusCode).toBe(403);
  });

  itDb('404s for an unknown department id', async () => {
    const res = await request(app).get('/api/departments/00000000-0000-4000-8000-000000000000');
    expect(res.statusCode).toBe(404);
  });
});
