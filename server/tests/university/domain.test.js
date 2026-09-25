const request = require('supertest');

const app = require('../../src/app');
const { sequelize, UniversityDomain } = require('../../src/models');
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

describe('University domains', () => {
  itDb('SUPER_ADMIN adds a domain', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/domains`)
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'Example.EDU', is_primary: true });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.domain).toBe('example.edu'); // normalized
    expect(res.body.data.is_primary).toBe(true);
  });

  itDb('rejects a full email address, not just a domain (422)', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .post(`/api/universities/${university.uuid}/domains`)
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'someone@example.edu' });

    expect(res.statusCode).toBe(422);
  });

  itDb('rejects a domain already registered to any university (409)', async () => {
    const university = await createUniversity();
    const other = await createUniversity({ slug: 'domain-other-u' });
    const { token } = await createSuperAdmin();

    await request(app)
      .post(`/api/universities/${university.uuid}/domains`)
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'shared.edu' });

    const res = await request(app)
      .post(`/api/universities/${other.uuid}/domains`)
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'shared.edu' });

    expect(res.statusCode).toBe(409);
  });

  itDb('lists domains for a university (not public — requires permission)', async () => {
    const university = await createUniversity();
    await UniversityDomain.create({ universityId: university.id, domain: 'listed.edu' });
    const { token } = await createSuperAdmin();

    const authedRes = await request(app)
      .get(`/api/universities/${university.uuid}/domains`)
      .set('Authorization', `Bearer ${token}`);
    expect(authedRes.statusCode).toBe(200);
    expect(authedRes.body.data).toHaveLength(1);

    const publicRes = await request(app).get(`/api/universities/${university.uuid}/domains`);
    expect(publicRes.statusCode).toBe(401);
  });

  itDb('STUDENT cannot view or manage domains (403)', async () => {
    const university = await createUniversity();
    const student = await createUserWithRole('STUDENT');
    const token = await loginToken(student.email);

    const res = await request(app)
      .get(`/api/universities/${university.uuid}/domains`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });

  itDb('removes (soft-deletes) a domain', async () => {
    const university = await createUniversity();
    const domain = await UniversityDomain.create({ universityId: university.id, domain: 'removable.edu' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .delete(`/api/universities/${university.uuid}/domains/${domain.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);

    const stillInDb = await UniversityDomain.findByPk(domain.id, { paranoid: false });
    expect(stillInDb).not.toBeNull();
    expect(stillInDb.deletedAt).not.toBeNull();

    const goneFromDefaultScope = await UniversityDomain.findByPk(domain.id);
    expect(goneFromDefaultScope).toBeNull();
  });

  itDb("UNIVERSITY_ADMIN cannot manage another university's domains (ownership enforced)", async () => {
    const ownUniversity = await createUniversity({ slug: 'domain-own-u' });
    const otherUniversity = await createUniversity({ slug: 'domain-other-u2' });
    const { token } = await createUniversityAdmin(ownUniversity);

    const res = await request(app)
      .post(`/api/universities/${otherUniversity.uuid}/domains`)
      .set('Authorization', `Bearer ${token}`)
      .send({ domain: 'sneaky.edu' });

    expect(res.statusCode).toBe(403);
  });

  itDb('404s when removing a domain that does not belong to the given university', async () => {
    const university = await createUniversity();
    const other = await createUniversity({ slug: 'domain-other-u3' });
    const domain = await UniversityDomain.create({ universityId: other.id, domain: 'elsewhere.edu' });
    const { token } = await createSuperAdmin();

    const res = await request(app)
      .delete(`/api/universities/${university.uuid}/domains/${domain.uuid}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});
