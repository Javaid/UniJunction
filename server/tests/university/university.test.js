const request = require('supertest');

const app = require('../../src/app');
const { sequelize } = require('../../src/models');
const { isDbAvailable, seedRbac, resetAuthTables, resetInstitutionTables, itIfDb } = require('../helpers/testDb');
const { createSuperAdmin, createUniversityAdmin, createUserWithRole, loginToken, createUniversity } = require('../helpers/institutionFixtures');

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

const validPayload = (overrides = {}) => ({
  name: 'Example University',
  short_name: 'EU',
  slug: `example-university-${Date.now()}`,
  description: 'An example institution.',
  website_url: 'https://example.edu',
  country: 'Pakistan',
  state_province: 'Punjab',
  city: 'Lahore',
  address: '123 Main St',
  ...overrides,
});

describe('POST /api/universities', () => {
  itDb('SUPER_ADMIN creates a university', async () => {
    const { token } = await createSuperAdmin();
    const res = await request(app).post('/api/universities').set('Authorization', `Bearer ${token}`).send(validPayload());

    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe('Example University');
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.verification_status).toBe('UNVERIFIED');
  });

  itDb('rejects a duplicate slug with 409', async () => {
    const { token } = await createSuperAdmin();
    const payload = validPayload({ slug: 'duplicate-slug' });
    await request(app).post('/api/universities').set('Authorization', `Bearer ${token}`).send(payload);

    const res = await request(app).post('/api/universities').set('Authorization', `Bearer ${token}`).send(payload);
    expect(res.statusCode).toBe(409);
  });

  itDb('rejects an invalid slug with 422', async () => {
    const { token } = await createSuperAdmin();
    const res = await request(app)
      .post('/api/universities')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload({ slug: 'Not A Valid Slug!' }));

    expect(res.statusCode).toBe(422);
  });

  itDb('STUDENT cannot create a university (403)', async () => {
    const student = await createUserWithRole('STUDENT');
    const token = await loginToken(student.email);
    const res = await request(app).post('/api/universities').set('Authorization', `Bearer ${token}`).send(validPayload());
    expect(res.statusCode).toBe(403);
  });

  itDb('UNIVERSITY_ADMIN cannot create a university (403 — SUPER_ADMIN only)', async () => {
    const university = await createUniversity();
    const { token } = await createUniversityAdmin(university);
    const res = await request(app).post('/api/universities').set('Authorization', `Bearer ${token}`).send(validPayload());
    expect(res.statusCode).toBe(403);
  });

  itDb('unauthenticated request is rejected with 401', async () => {
    const res = await request(app).post('/api/universities').send(validPayload());
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/universities and /:id', () => {
  itDb('list is public and paginated', async () => {
    await createUniversity({ name: 'Alpha University', slug: 'alpha-u' });
    await createUniversity({ name: 'Beta University', slug: 'beta-u' });

    const res = await request(app).get('/api/universities').query({ page: 1, pageSize: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 1, total: 2 });
  });

  itDb('search matches name/city/country', async () => {
    await createUniversity({ name: 'Zed Institute of Technology', slug: 'zed-tech', city: 'Karachi' });
    await createUniversity({ name: 'Nothing Matching', slug: 'nothing-matching', city: 'Nowhere' });

    const res = await request(app).get('/api/universities').query({ search: 'Karachi' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].city).toBe('Karachi');
  });

  itDb('status filter narrows results', async () => {
    await createUniversity({ slug: 'active-u', status: 'ACTIVE' });
    await createUniversity({ slug: 'suspended-u', status: 'SUSPENDED' });

    const res = await request(app).get('/api/universities').query({ status: 'SUSPENDED' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('SUSPENDED');
  });

  itDb('rejects an arbitrary, non-whitelisted sort field with 422', async () => {
    const res = await request(app).get('/api/universities').query({ sortBy: 'password_hash' });
    expect(res.statusCode).toBe(422);
  });

  itDb('public GET returns only public fields; SUPER_ADMIN GET returns admin fields too', async () => {
    const university = await createUniversity();

    const publicRes = await request(app).get(`/api/universities/${university.uuid}`);
    expect(publicRes.statusCode).toBe(200);
    expect(publicRes.body.data).not.toHaveProperty('verification_status');
    expect(publicRes.body.data).not.toHaveProperty('email_domain');

    const { token } = await createSuperAdmin();
    const adminRes = await request(app)
      .get(`/api/universities/${university.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.body.data).toHaveProperty('verification_status');
  });

  itDb('an invalid/unknown university id returns 404', async () => {
    const res = await request(app).get('/api/universities/00000000-0000-4000-8000-000000000000');
    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /api/universities/:id', () => {
  itDb('SUPER_ADMIN can update any university', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .put(`/api/universities/${university.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Islamabad' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.city).toBe('Islamabad');
  });

  itDb('UNIVERSITY_ADMIN can update their OWN university', async () => {
    const university = await createUniversity();
    const { token } = await createUniversityAdmin(university);

    const res = await request(app)
      .put(`/api/universities/${university.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Multan' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.city).toBe('Multan');
  });

  itDb('UNIVERSITY_ADMIN CANNOT update a DIFFERENT university (403)', async () => {
    const ownUniversity = await createUniversity({ slug: 'own-university' });
    const otherUniversity = await createUniversity({ slug: 'other-university' });
    const { token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .put(`/api/universities/${otherUniversity.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Nowhere' });

    expect(res.statusCode).toBe(403);
  });

  itDb('ignores an attempt to change the slug through ordinary update', async () => {
    const university = await createUniversity({ slug: 'immutable-slug' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .put(`/api/universities/${university.uuid}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'attempted-new-slug', name: 'Updated Name' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.slug).toBe('immutable-slug');
  });
});

describe('PATCH /api/universities/:id/status', () => {
  itDb('SUPER_ADMIN can change status', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SUSPENDED' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('SUSPENDED');
  });

  itDb('UNIVERSITY_ADMIN cannot change status, even for their own university (403)', async () => {
    const university = await createUniversity();
    const { token } = await createUniversityAdmin(university);

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SUSPENDED' });

    expect(res.statusCode).toBe(403);
  });

  itDb('rejects an invalid status value with 422', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'NOT_A_REAL_STATUS' });

    expect(res.statusCode).toBe(422);
  });
});

describe('PATCH /api/universities/:id/verification', () => {
  itDb('SUPER_ADMIN verifying sets verified_at', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'VERIFIED' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.verification_status).toBe('VERIFIED');
    expect(res.body.data.verified_at).not.toBeNull();
  });

  itDb('revoking verification clears verified_at', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    await request(app)
      .patch(`/api/universities/${university.uuid}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'VERIFIED' });

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'REJECTED' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.verification_status).toBe('REJECTED');
    expect(res.body.data.verified_at).toBeNull();
  });

  itDb('UNIVERSITY_ADMIN cannot verify their own university (403)', async () => {
    const university = await createUniversity();
    const { token } = await createUniversityAdmin(university);

    const res = await request(app)
      .patch(`/api/universities/${university.uuid}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'VERIFIED' });

    expect(res.statusCode).toBe(403);
  });
});
