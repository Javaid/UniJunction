const request = require('supertest');

const app = require('../../src/app');
const { sequelize, Department, Program } = require('../../src/models');
const {
  isDbAvailable,
  seedRbac,
  resetAuthTables,
  resetInstitutionTables,
  resetStudentProfileTables,
  itIfDb,
} = require('../helpers/testDb');
const {
  createUniversity: createUniversityFixture,
  createUniversityAdmin,
  createSuperAdmin,
} = require('../helpers/institutionFixtures');
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

const createActiveProgram = async (universityId, name = 'BS Computer Science') => {
  const department = await Department.create({ universityId, name: `${name} Dept` });
  return Program.create({ universityId, departmentId: department.id, name, degreeLevel: 'BACHELOR', status: 'ACTIVE' });
};

describe('§35: GET /api/universities/:universityId/students', () => {
  itDb("a UNIVERSITY_ADMIN can list their own university's students", async () => {
    const university = await createUniversity();
    const { token: studentToken } = await createStudentMember(university);
    await request(app).post('/api/students/me/profile').set('Authorization', `Bearer ${studentToken}`).send({
      university_id: university.uuid,
    });
    const { token: adminToken } = await createUniversityAdmin(university);

    const res = await request(app)
      .get(`/api/universities/${university.uuid}/students`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].student_identifier).toBeUndefined();
  });

  itDb("a UNIVERSITY_ADMIN cannot list a DIFFERENT university's students (403)", async () => {
    const university = await createUniversity();
    const otherUniversity = await createUniversity({ slug: 'admin-list-other-u' });
    const { token: adminToken } = await createUniversityAdmin(otherUniversity);

    const res = await request(app)
      .get(`/api/universities/${university.uuid}/students`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(403);
  });

  itDb('a SUPER_ADMIN can list any university\'s students', async () => {
    const university = await createUniversity();
    const { token: studentToken } = await createStudentMember(university);
    await request(app).post('/api/students/me/profile').set('Authorization', `Bearer ${studentToken}`).send({
      university_id: university.uuid,
    });
    const { token: superAdminToken } = await createSuperAdmin();

    const res = await request(app)
      .get(`/api/universities/${university.uuid}/students`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  itDb('a plain STUDENT cannot list university students (403)', async () => {
    const university = await createUniversity();
    const { token: studentToken } = await createStudentMember(university);

    const res = await request(app)
      .get(`/api/universities/${university.uuid}/students`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(403);
  });

  itDb('supports filtering by program_id and academic_status', async () => {
    const university = await createUniversity();
    const programA = await createActiveProgram(university.id, 'Program A');
    const programB = await createActiveProgram(university.id, 'Program B');

    const { token: studentAToken } = await createStudentMember(university);
    await request(app).post('/api/students/me/profile').set('Authorization', `Bearer ${studentAToken}`).send({
      university_id: university.uuid,
      program_id: programA.uuid,
    });

    const { token: studentBToken } = await createStudentMember(university);
    await request(app).post('/api/students/me/profile').set('Authorization', `Bearer ${studentBToken}`).send({
      university_id: university.uuid,
      program_id: programB.uuid,
    });

    const { token: adminToken } = await createUniversityAdmin(university);
    const res = await request(app)
      .get(`/api/universities/${university.uuid}/students`)
      .query({ program_id: programA.uuid })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].program.id).toBe(programA.uuid);
  });

  itDb('paginates results', async () => {
    const university = await createUniversity();
    for (let i = 0; i < 3; i++) {
      const { token } = await createStudentMember(university);
      await request(app).post('/api/students/me/profile').set('Authorization', `Bearer ${token}`).send({
        university_id: university.uuid,
      });
    }
    const { token: adminToken } = await createUniversityAdmin(university);

    const res = await request(app)
      .get(`/api/universities/${university.uuid}/students`)
      .query({ page: 1, pageSize: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
  });
});
