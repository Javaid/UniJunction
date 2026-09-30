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
  createUserWithRole,
  loginToken,
} = require('../helpers/institutionFixtures');
const { createStudentMember } = require('../helpers/studentFixtures');

// Universities default to PENDING status (see university.model.js) — most
// of these tests are about student-profile logic, not university
// activation, so default to ACTIVE unless a test deliberately overrides
// it (e.g. the SUSPENDED-university rejection test below).
const createUniversity = (overrides = {}) => createUniversityFixture({ status: 'ACTIVE', ...overrides });

let dbReady = false;
const itDb = itIfDb(() => dbReady);

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

const createActiveProgram = async (universityId, overrides = {}) => {
  const department = await Department.create({ universityId, name: overrides.departmentName || 'CS' });
  return Program.create({
    universityId,
    departmentId: department.id,
    name: overrides.name || 'BS Computer Science',
    degreeLevel: 'BACHELOR',
    status: overrides.status || 'ACTIVE',
  });
};

describe('Student profile creation', () => {
  itDb('creates a profile for an active student with a valid university and program', async () => {
    const university = await createUniversity();
    const program = await createActiveProgram(university.id);
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, program_id: program.uuid, headline: 'CS Student' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.headline).toBe('CS Student');
    expect(res.body.data.program.id).toBe(program.uuid);
    expect(res.body.data.university.id).toBe(university.uuid);
    // §24: server-calculated, never trusted from the client (which never sent one).
    expect(res.body.data.profile_completeness.score).toBeGreaterThanOrEqual(0);
  });

  itDb('creates a profile without a program (optional)', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.program).toBeNull();
  });

  itDb('rejects a duplicate profile (409)', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);

    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    expect(res.statusCode).toBe(409);
  });

  itDb('rejects a nonexistent program (404)', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, program_id: '00000000-0000-4000-8000-000000000000' });

    expect(res.statusCode).toBe(404);
  });

  itDb('rejects a program belonging to a DIFFERENT university (400)', async () => {
    const university = await createUniversity();
    const otherUniversity = await createUniversity({ slug: 'profile-other-u' });
    const otherProgram = await createActiveProgram(otherUniversity.id);
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, program_id: otherProgram.uuid });

    expect(res.statusCode).toBe(400);
  });

  itDb('rejects an INACTIVE program (400)', async () => {
    const university = await createUniversity();
    const inactiveProgram = await createActiveProgram(university.id, { status: 'INACTIVE' });
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, program_id: inactiveProgram.uuid });

    expect(res.statusCode).toBe(400);
  });

  itDb('rejects creation for a user without the STUDENT role (403)', async () => {
    const university = await createUniversity();
    const facultyUser = await createUserWithRole('FACULTY');
    const token = await loginToken(facultyUser.email);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    expect(res.statusCode).toBe(403);
  });

  itDb('rejects creation for a STUDENT with no active membership at that university (403)', async () => {
    const university = await createUniversity();
    const studentUser = await createUserWithRole('STUDENT');
    const token = await loginToken(studentUser.email);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    expect(res.statusCode).toBe(403);
  });

  itDb('rejects creation against a SUSPENDED university (400)', async () => {
    const university = await createUniversity({ status: 'SUSPENDED' });
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    expect(res.statusCode).toBe(400);
  });
});

describe('Student profile self-service read/update', () => {
  itDb('a student can fetch their own profile', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    const res = await request(app).get('/api/students/me/profile').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.university.id).toBe(university.uuid);
  });

  itDb('returns 404 for a user with no profile yet', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);

    const res = await request(app).get('/api/students/me/profile').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  itDb('a student can update their own headline, bio, and availability', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    const res = await request(app)
      .put('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ headline: 'Updated headline', bio: 'Updated bio', availability_status: 'AVAILABLE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.headline).toBe('Updated headline');
    expect(res.body.data.availability_status).toBe('AVAILABLE');
  });

  itDb('§40: cannot change university_id, student_identifier, or academic_status via the ordinary update endpoint', async () => {
    const university = await createUniversity();
    const otherUniversity = await createUniversity({ slug: 'update-other-u' });
    const { token } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, student_identifier: 'STU-001' });

    const res = await request(app)
      .put('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        university_id: otherUniversity.uuid,
        student_identifier: 'HACKED-ID',
        academic_status: 'GRADUATED',
        headline: 'Still allowed',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.university.id).toBe(university.uuid);
    expect(res.body.data.student_identifier).toBe('STU-001');
    expect(res.body.data.academic_status).toBe('ACTIVE');
    expect(res.body.data.headline).toBe('Still allowed');
  });

  itDb('changes academic_status only via the dedicated PATCH endpoint', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    const res = await request(app)
      .patch('/api/students/me/profile/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ON_LEAVE' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.academic_status).toBe('ON_LEAVE');
  });

  itDb('rejects an invalid academic_status value (422)', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    const res = await request(app)
      .patch('/api/students/me/profile/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'NOT_A_REAL_STATUS' });

    expect(res.statusCode).toBe(422);
  });

  itDb('program_id on update must still belong to the profile\'s own university (400)', async () => {
    const university = await createUniversity();
    const otherUniversity = await createUniversity({ slug: 'update-program-other-u' });
    const otherProgram = await createActiveProgram(otherUniversity.id);
    const { token } = await createStudentMember(university);
    await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });

    const res = await request(app)
      .put('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ program_id: otherProgram.uuid });

    expect(res.statusCode).toBe(400);
  });

  itDb('rejects HTML in the headline (422)', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, headline: '<script>alert(1)</script>' });

    expect(res.statusCode).toBe(422);
  });

  itDb('rejects a client-supplied profile_completion field (stripped, never trusted)', async () => {
    const university = await createUniversity();
    const { token } = await createStudentMember(university);

    const res = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid, profile_completion: 100 });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.profile_completeness.score).toBeLessThan(100);
  });
});

describe('Student profile audit logging', () => {
  itDb('audits STUDENT_PROFILE_CREATED and STUDENT_PROFILE_STATUS_CHANGED', async () => {
    const { AuditLog } = require('../../src/models');
    const university = await createUniversity();
    const { token, user } = await createStudentMember(university);

    const createRes = await request(app)
      .post('/api/students/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ university_id: university.uuid });
    expect(createRes.statusCode).toBe(201);

    await request(app)
      .patch('/api/students/me/profile/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ON_LEAVE' });

    const logs = await AuditLog.findAll({ where: { actorUserId: user.id }, order: [['id', 'ASC']] });
    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining(['STUDENT_PROFILE_CREATED', 'STUDENT_PROFILE_STATUS_CHANGED'])
    );
  });
});
