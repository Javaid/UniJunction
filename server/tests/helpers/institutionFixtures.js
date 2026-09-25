/**
 * Shared fixtures for the Chunk 04 institution-management integration
 * tests. Mirrors the pattern established in Chunk 03's individual test
 * files, pulled into one place since this chunk's test files repeat it
 * far more (create a user with a role, log in, create a university) —
 * see docs/development-guidelines.md, "no premature abstraction" (this
 * one earns its keep by the fourth call site).
 */
const request = require('supertest');
const app = require('../../src/app');
const { User, Role, University } = require('../../src/models');
const { hashPassword } = require('../../src/modules/auth/password.service');

let counter = 0;
const uniqueEmail = (label) => `${label}${Date.now()}${counter++}@example.com`;

const createUserWithRole = async (roleName, { email, status = 'ACTIVE' } = {}) => {
  const passwordHash = await hashPassword('Password123');
  const user = await User.create({
    email: email || uniqueEmail(roleName.toLowerCase()),
    passwordHash,
    firstName: 'Test',
    lastName: roleName,
    status,
  });
  const role = await Role.findOne({ where: { name: roleName } });
  await user.addRole(role);
  return user;
};

const loginToken = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  if (!res.body.access_token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.access_token;
};

const createSuperAdmin = async () => {
  const user = await createUserWithRole('SUPER_ADMIN');
  const token = await loginToken(user.email);
  return { user, token };
};

const createUniversity = async (overrides = {}) => {
  const suffix = `${Date.now()}${counter++}`;
  return University.create({
    name: overrides.name || `Test University ${suffix}`,
    slug: overrides.slug || `test-university-${suffix}`,
    ...overrides,
  });
};

/**
 * A UNIVERSITY_ADMIN with an ACTIVE ADMIN-type membership at `university`
 * — the combination access.service.js actually checks (role alone is
 * global, not university-scoped — see docs/university-management.md).
 */
const createUniversityAdmin = async (university) => {
  const { UniversityMembership } = require('../../src/models');
  const { MEMBERSHIP_TYPE, MEMBERSHIP_STATUS } = require('../../src/utils/enums');

  const user = await createUserWithRole('UNIVERSITY_ADMIN');
  await UniversityMembership.create({
    userId: user.id,
    universityId: university.id,
    membershipType: MEMBERSHIP_TYPE.ADMIN,
    status: MEMBERSHIP_STATUS.ACTIVE,
  });
  const token = await loginToken(user.email);
  return { user, token };
};

module.exports = {
  createUserWithRole,
  loginToken,
  createSuperAdmin,
  createUniversity,
  createUniversityAdmin,
  uniqueEmail,
};
