const request = require('supertest');

const app = require('../../src/app');
const { sequelize, Department, Program } = require('../../src/models');
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

describe('Program CRUD', () => {
  itDb('creates a program under a department', async () => {
    const university = await createUniversity();
    const department = await Department.create({ universityId: university.id, name: 'CS' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/programs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'BS Computer Science', degree_level: 'BACHELOR', department_id: department.uuid, duration_years: 4 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.department_id).toBe(department.uuid);
    expect(res.body.data.degree_level).toBe('BACHELOR');
  });

  itDb('rejects an unrecognized degree_level with 422', async () => {
    const university = await createUniversity();
    const department = await Department.create({ universityId: university.id, name: 'CS' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/programs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Made Up Degree', degree_level: 'NOT_A_DEGREE', department_id: department.uuid });

    expect(res.statusCode).toBe(422);
  });

  itDb('rejects a department_id belonging to a DIFFERENT university (400)', async () => {
    const university = await createUniversity();
    const otherUniversity = await createUniversity({ slug: 'prog-other-u' });
    const otherDepartment = await Department.create({ universityId: otherUniversity.id, name: 'Other Dept' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/programs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cross Tenant Program', degree_level: 'BACHELOR', department_id: otherDepartment.uuid });

    expect(res.statusCode).toBe(400);
  });

  itDb('updates a program via its flat id (descriptive fields only)', async () => {
    const university = await createUniversity();
    const department = await Department.create({ universityId: university.id, name: 'CS' });
    const program = await Program.create({
      universityId: university.id,
      departmentId: department.id,
      name: 'Old Name',
      degreeLevel: 'BACHELOR',
    });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .put(`/api/programs/${program.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', degree_level: 'MASTER' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('New Name');
    expect(res.body.data.degree_level).toBe('MASTER');
  });

  itDb('changes program status', async () => {
    const university = await createUniversity();
    const department = await Department.create({ universityId: university.id, name: 'CS' });
    const program = await Program.create({
      universityId: university.id,
      departmentId: department.id,
      name: 'P',
      degreeLevel: 'PHD',
    });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .patch(`/api/programs/${program.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'INACTIVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
  });

  itDb("UNIVERSITY_ADMIN cannot modify another university's program (ownership enforced)", async () => {
    const ownUniversity = await createUniversity({ slug: 'prog-own-u' });
    const otherUniversity = await createUniversity({ slug: 'prog-other-u2' });
    const otherDepartment = await Department.create({ universityId: otherUniversity.id, name: 'Other Dept' });
    const otherProgram = await Program.create({
      universityId: otherUniversity.id,
      departmentId: otherDepartment.id,
      name: 'Other Program',
      degreeLevel: 'BACHELOR',
    });
    const { token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .put(`/api/programs/${otherProgram.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hacked' });

    expect(res.statusCode).toBe(403);
  });

  itDb('404s for an unknown program id', async () => {
    const res = await request(app).get('/api/programs/00000000-0000-4000-8000-000000000000');
    expect(res.statusCode).toBe(404);
  });
});
