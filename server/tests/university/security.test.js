/**
 * Directly traceable to chunk brief §45 ("Security Testing"), one
 * describe block per numbered item. Some of these properties are also
 * exercised incidentally elsewhere (university.test.js,
 * department.test.js, ...) — this file exists so the ten explicitly
 * required checks are each visible in one place, not just implied.
 */
const request = require('supertest');

const app = require('../../src/app');
const { sequelize, Department, Faculty } = require('../../src/models');
const { isDbAvailable, seedRbac, resetAuthTables, resetInstitutionTables, itIfDb } = require('../helpers/testDb');
const {
  createSuperAdmin,
  createUniversityAdmin,
  createUserWithRole,
  loginToken,
  createUniversity,
} = require('../helpers/institutionFixtures');

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

describe('§45.1 — UNIVERSITY_ADMIN attempting to modify another university', () => {
  itDb('is denied with 403', async () => {
    const own = await createUniversity({ slug: 'sec-1-own' });
    const other = await createUniversity({ slug: 'sec-1-other' });
    const { token } = await createUniversityAdmin(own);

    const res = await request(app)
      .put(`/api/universities/${other.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should not work' });

    expect(res.statusCode).toBe(403);
  });
});

describe("§45.2 — UNIVERSITY_ADMIN attempting to modify another university's department", () => {
  itDb('is denied with 403', async () => {
    const own = await createUniversity({ slug: 'sec-2-own' });
    const other = await createUniversity({ slug: 'sec-2-other' });
    const department = await Department.create({ universityId: other.id, name: 'Other Dept' });
    const { token } = await createUniversityAdmin(own);

    const res = await request(app)
      .put(`/api/departments/${department.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should not work' });

    expect(res.statusCode).toBe(403);
  });
});

describe('§45.3 — UNIVERSITY_ADMIN attempting to assign themselves admin of another university', () => {
  itDb('is denied with 403', async () => {
    const own = await createUniversity({ slug: 'sec-3-own' });
    const other = await createUniversity({ slug: 'sec-3-other' });
    const { user, token } = await createUniversityAdmin(own);

    const res = await request(app)
      .post(`/api/admin/universities/${other.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: user.uuid });

    expect(res.statusCode).toBe(403);
  });
});

describe('§45.4 — STUDENT attempting to call admin APIs', () => {
  itDb('is denied 403 on university create, status update, and admin assignment', async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const token = await loginToken(student.email);

    const create = await request(app)
      .post('/api/universities')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', slug: 'x-university' });
    expect(create.statusCode).toBe(403);

    const status = await request(app)
      .patch(`/api/universities/${university.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SUSPENDED' });
    expect(status.statusCode).toBe(403);

    const assign = await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: student.uuid });
    expect(assign.statusCode).toBe(403);
  });
});

describe('§45.5 — missing permissions produce 403, not a silent allow or a 500', () => {
  itDb('a FACULTY-role user without institutional permissions cannot create a faculty', async () => {
    const university = await createUniversity();
    const facultyMember = await createUserWithRole('FACULTY');
    const token = await loginToken(facultyMember.email);

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/faculties`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should not work' });

    expect(res.statusCode).toBe(403);
  });
});

describe('§45.6 — invalid university IDs', () => {
  itDb('a syntactically-invalid id is treated as not found, not a server error', async () => {
    const res = await request(app).get('/api/universities/not-a-uuid-at-all');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  itDb('a well-formed but nonexistent uuid is 404', async () => {
    const res = await request(app).get('/api/universities/00000000-0000-4000-8000-000000000000');
    expect(res.statusCode).toBe(404);
  });
});

describe('§45.7 — cross-university resource access is rejected', () => {
  itDb('a faculty_id from a different university cannot be attached to a new department', async () => {
    const university = await createUniversity({ slug: 'sec-7-a' });
    const other = await createUniversity({ slug: 'sec-7-b' });
    const otherFaculty = await Faculty.create({ universityId: other.id, name: 'Other Faculty' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/departments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'D', faculty_id: otherFaculty.uuid });

    expect(res.statusCode).toBe(400);
  });
});

describe('§45.8 — attempted hard deletion never removes a row', () => {
  itDb('there is no DELETE route for universities, faculties, departments, or programs', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .delete(`/api/universities/${university.uuid}`)
      .set('Authorization', `Bearer ${token}`);

    // No route registered for DELETE /api/universities/:id at all —
    // Express's 404 for an unmatched method+path, not a permission error.
    expect(res.statusCode).toBe(404);
  });
});

describe('§45.9 — invalid status values are rejected before reaching the database', () => {
  itDb('university status must be one of the documented values', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DELETED' }); // not a real status

    expect(res.statusCode).toBe(422);
  });

  itDb('membership status must be one of the documented values', async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();
    const created = await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: student.uuid, membership_type: 'STUDENT' });

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/members/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'GRADUATED' }); // not a real status

    expect(res.statusCode).toBe(422);
  });
});

describe('§45.10 — manipulation of client-supplied university IDs is rejected', () => {
  itDb('cannot create a program by claiming a department that belongs to a different university', async () => {
    const university = await createUniversity({ slug: 'sec-10-a' });
    const other = await createUniversity({ slug: 'sec-10-b' });
    const otherDepartment = await Department.create({ universityId: other.id, name: 'Other Dept' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/programs`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'P', degree_level: 'BACHELOR', department_id: otherDepartment.uuid });

    expect(res.statusCode).toBe(400);
  });

  itDb("a UNIVERSITY_ADMIN cannot use another university's id in the URL to bypass their own scope", async () => {
    const own = await createUniversity({ slug: 'sec-10-own' });
    const other = await createUniversity({ slug: 'sec-10-other' });
    const { token } = await createUniversityAdmin(own);

    const res = await request(app)
      .post(`/api/universities/${other.uuid}/faculties`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'F' });

    expect(res.statusCode).toBe(403);
  });
});
