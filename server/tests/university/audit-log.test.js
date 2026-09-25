const request = require('supertest');

const app = require('../../src/app');
const { sequelize, AuditLog } = require('../../src/models');
const { isDbAvailable, seedRbac, resetAuthTables, resetInstitutionTables, itIfDb } = require('../helpers/testDb');
const { createSuperAdmin, createUserWithRole, createUniversity } = require('../helpers/institutionFixtures');

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
    await AuditLog.destroy({ where: {}, force: true });
  }
});

afterAll(async () => sequelize.close());

const findLog = (action, entityId) => AuditLog.findOne({ where: { action, entityId } });

describe('Audit logging for institutional changes', () => {
  itDb('records UNIVERSITY_CREATED', async () => {
    const { user, token } = await createSuperAdmin();
    const res = await request(app)
      .post('/api/universities')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Audited University', slug: `audited-university-${Date.now()}` });

    const universityInternalId = await sequelize.models.University.findOne({
      where: { uuid: res.body.data.id },
    });
    const log = await findLog('UNIVERSITY_CREATED', universityInternalId.id);
    expect(log).not.toBeNull();
    expect(log.actorUserId).toBe(user.id);
    expect(log.universityId).toBe(universityInternalId.id);
  });

  itDb('records UNIVERSITY_STATUS_CHANGED with from/to metadata', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    await request(app)
      .patch(`/api/universities/${university.uuid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SUSPENDED' });

    const log = await findLog('UNIVERSITY_STATUS_CHANGED', university.id);
    expect(log).not.toBeNull();
    expect(log.metadata).toMatchObject({ from: 'PENDING', to: 'SUSPENDED' });
  });

  itDb('records UNIVERSITY_VERIFICATION_CHANGED', async () => {
    const university = await createUniversity();
    const { token } = await createSuperAdmin();

    await request(app)
      .patch(`/api/universities/${university.uuid}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'VERIFIED' });

    const log = await findLog('UNIVERSITY_VERIFICATION_CHANGED', university.id);
    expect(log).not.toBeNull();
    expect(log.metadata).toMatchObject({ from: 'UNVERIFIED', to: 'VERIFIED' });
  });

  itDb('records UNIVERSITY_ADMIN_ASSIGNED', async () => {
    const university = await createUniversity();
    const target = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();

    await request(app)
      .post(`/api/admin/universities/${university.uuid}/admins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: target.uuid });

    const log = await findLog('UNIVERSITY_ADMIN_ASSIGNED', university.id);
    expect(log).not.toBeNull();
    expect(log.metadata).toMatchObject({ targetUserId: target.id });
  });

  itDb('records MEMBERSHIP_CREATED and MEMBERSHIP_STATUS_CHANGED', async () => {
    const university = await createUniversity();
    const target = await createUserWithRole('STUDENT');
    const { token } = await createSuperAdmin();

    const created = await request(app)
      .post(`/api/universities/${university.uuid}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: target.uuid, membership_type: 'STUDENT', status: 'ACTIVE' });

    const membershipRow = await sequelize.models.UniversityMembership.findOne({
      where: { uuid: created.body.data.id },
    });
    const createdLog = await findLog('MEMBERSHIP_CREATED', membershipRow.id);
    expect(createdLog).not.toBeNull();

    await request(app)
      .patch(`/api/universities/${university.uuid}/members/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ENDED' });

    const statusLog = await findLog('MEMBERSHIP_STATUS_CHANGED', membershipRow.id);
    expect(statusLog).not.toBeNull();
    expect(statusLog.metadata).toMatchObject({ from: 'ACTIVE', to: 'ENDED' });
  });

  itDb('never includes a password or token value in metadata', async () => {
    const { token } = await createSuperAdmin();
    await request(app)
      .post('/api/universities')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No Secrets University', slug: `no-secrets-${Date.now()}` });

    const logs = await AuditLog.findAll();
    logs.forEach((log) => {
      const serialized = JSON.stringify(log.metadata || {});
      expect(serialized.toLowerCase()).not.toMatch(/password|token/);
    });
  });
});
