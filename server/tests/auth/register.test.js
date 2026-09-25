const request = require('supertest');

jest.mock('../../src/modules/auth/email.provider', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = require('../../src/app');
const { sequelize, User } = require('../../src/models');
const { sendVerificationEmail } = require('../../src/modules/auth/email.provider');
const { isDbAvailable, seedRbac, resetAuthTables, itIfDb } = require('../helpers/testDb');

let dbReady = false;
const itDb = itIfDb(() => dbReady);

beforeAll(async () => {
  dbReady = await isDbAvailable();
  if (dbReady) await seedRbac();
});

beforeEach(async () => {
  jest.clearAllMocks();
  if (dbReady) await resetAuthTables();
});

afterAll(async () => sequelize.close());

const validPayload = {
  email: 'newstudent@example.com',
  password: 'Password123',
  first_name: 'New',
  last_name: 'Student',
};

describe('POST /api/auth/register', () => {
  itDb('registers successfully, assigns STUDENT, and queues a verification email', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('newstudent@example.com');
    expect(res.body.user.roles).toEqual(['STUDENT']);
    expect(res.body.user).not.toHaveProperty('password_hash');

    const created = await User.unscoped().findOne({ where: { email: 'newstudent@example.com' } });
    expect(created).not.toBeNull();
    expect(created.passwordHash).not.toBe('Password123');
    expect(created.status).toBe('PENDING');

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  itDb('normalizes email case before storing/looking it up', async () => {
    await request(app).post('/api/auth/register').send({ ...validPayload, email: 'Mixed@Example.COM' });
    const found = await User.findOne({ where: { email: 'mixed@example.com' } });
    expect(found).not.toBeNull();
  });

  itDb('rejects a duplicate email with 409 and does not create a second row', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);

    const count = await User.count({ where: { email: validPayload.email } });
    expect(count).toBe(1);
  });

  itDb('rejects an invalid email with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'not-an-email' });

    expect(res.statusCode).toBe(422);
  });

  itDb('rejects a weak password (no digit) with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, password: 'onlyletters' });

    expect(res.statusCode).toBe(422);
  });

  itDb('rejects a short password with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validPayload, password: 'Ab1' });
    expect(res.statusCode).toBe(422);
  });

  itDb('rejects missing required fields with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: validPayload.email, password: validPayload.password });

    expect(res.statusCode).toBe(422);
  });

  itDb('never accepts a client-supplied role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, role: 'SUPER_ADMIN' });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.roles).toEqual(['STUDENT']);
  });
});
