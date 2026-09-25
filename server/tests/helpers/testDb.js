/**
 * Shared helper for the auth integration tests. Every auth test file
 * touches a real database (registration, login, tokens — there is no
 * meaningful way to test these behaviorally with mocks alone), so this
 * mirrors the graceful-skip pattern established in
 * tests/database.connection.test.js: if no database is reachable, tests
 * log a warning and pass trivially rather than failing the whole suite.
 *
 * To exercise these for real, point DB_* at a disposable test database
 * (see docs/database-guidelines.md) — the same one
 * database/schema.sql + database/seed_rbac.sql were applied to.
 */
const { sequelize, Role, Permission, RolePermission } = require('../../src/models');

let cachedAvailability;

const isDbAvailable = async () => {
  if (cachedAvailability !== undefined) return cachedAvailability;
  try {
    await sequelize.authenticate();
    cachedAvailability = true;
  } catch (error) {
    cachedAvailability = false;
  }
  return cachedAvailability;
};

const INITIAL_ROLES = [
  { name: 'SUPER_ADMIN', description: 'Full platform administrator' },
  { name: 'UNIVERSITY_ADMIN', description: 'Administrator scoped to a single university' },
  { name: 'FACULTY', description: 'Faculty member' },
  { name: 'RESEARCHER', description: 'Researcher' },
  { name: 'STUDENT', description: "Student — the default self-registration role" },
];

const INITIAL_PERMISSIONS = [
  'USER_VIEW',
  'USER_UPDATE',
  'ROLE_VIEW',
  'ROLE_ASSIGN',
  'SYSTEM_ADMIN',
  'UNIVERSITY_VIEW',
  'UNIVERSITY_CREATE',
  'UNIVERSITY_UPDATE',
  'UNIVERSITY_VERIFY',
  'UNIVERSITY_STATUS_UPDATE',
  'UNIVERSITY_ADMIN_VIEW',
  'UNIVERSITY_ADMIN_ASSIGN',
  'UNIVERSITY_MEMBER_VIEW',
  'UNIVERSITY_MEMBER_CREATE',
  'UNIVERSITY_MEMBER_UPDATE',
  'UNIVERSITY_DOMAIN_VIEW',
  'UNIVERSITY_DOMAIN_MANAGE',
  'FACULTY_VIEW',
  'FACULTY_CREATE',
  'FACULTY_UPDATE',
  'FACULTY_STATUS_UPDATE',
  'DEPARTMENT_VIEW',
  'DEPARTMENT_CREATE',
  'DEPARTMENT_UPDATE',
  'DEPARTMENT_STATUS_UPDATE',
  'PROGRAM_VIEW',
  'PROGRAM_CREATE',
  'PROGRAM_UPDATE',
  'PROGRAM_STATUS_UPDATE',
];

// Mirrors database/seed_rbac.sql exactly (§29/§30) — see
// docs/university-management.md, "Permissions".
const ROLE_PERMISSION_MAP = {
  SUPER_ADMIN: [
    'SYSTEM_ADMIN',
    'USER_VIEW',
    'USER_UPDATE',
    'ROLE_VIEW',
    'ROLE_ASSIGN',
    'UNIVERSITY_VIEW',
    'UNIVERSITY_CREATE',
    'UNIVERSITY_UPDATE',
    'UNIVERSITY_VERIFY',
    'UNIVERSITY_STATUS_UPDATE',
    'UNIVERSITY_ADMIN_VIEW',
    'UNIVERSITY_ADMIN_ASSIGN',
    'UNIVERSITY_MEMBER_VIEW',
    'UNIVERSITY_MEMBER_CREATE',
    'UNIVERSITY_MEMBER_UPDATE',
    'UNIVERSITY_DOMAIN_VIEW',
    'UNIVERSITY_DOMAIN_MANAGE',
    'FACULTY_VIEW',
    'FACULTY_CREATE',
    'FACULTY_UPDATE',
    'FACULTY_STATUS_UPDATE',
    'DEPARTMENT_VIEW',
    'DEPARTMENT_CREATE',
    'DEPARTMENT_UPDATE',
    'DEPARTMENT_STATUS_UPDATE',
    'PROGRAM_VIEW',
    'PROGRAM_CREATE',
    'PROGRAM_UPDATE',
    'PROGRAM_STATUS_UPDATE',
  ],
  UNIVERSITY_ADMIN: [
    'USER_VIEW',
    'UNIVERSITY_VIEW',
    'UNIVERSITY_UPDATE',
    'UNIVERSITY_ADMIN_VIEW',
    'UNIVERSITY_MEMBER_VIEW',
    'UNIVERSITY_MEMBER_CREATE',
    'UNIVERSITY_MEMBER_UPDATE',
    'UNIVERSITY_DOMAIN_VIEW',
    'UNIVERSITY_DOMAIN_MANAGE',
    'FACULTY_VIEW',
    'FACULTY_CREATE',
    'FACULTY_UPDATE',
    'FACULTY_STATUS_UPDATE',
    'DEPARTMENT_VIEW',
    'DEPARTMENT_CREATE',
    'DEPARTMENT_UPDATE',
    'DEPARTMENT_STATUS_UPDATE',
    'PROGRAM_VIEW',
    'PROGRAM_CREATE',
    'PROGRAM_UPDATE',
    'PROGRAM_STATUS_UPDATE',
  ],
  STUDENT: ['USER_VIEW', 'UNIVERSITY_VIEW'],
  FACULTY: ['USER_VIEW', 'UNIVERSITY_VIEW'],
  RESEARCHER: ['USER_VIEW', 'UNIVERSITY_VIEW'],
};

/** Mirrors database/seed_rbac.sql so tests never depend on it having been run. */
const seedRbac = async () => {
  const roles = {};
  for (const roleDef of INITIAL_ROLES) {
    const [role] = await Role.findOrCreate({ where: { name: roleDef.name }, defaults: roleDef });
    roles[roleDef.name] = role;
  }

  const permissions = {};
  for (const name of INITIAL_PERMISSIONS) {
    const [permission] = await Permission.findOrCreate({ where: { name } });
    permissions[name] = permission;
  }

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSION_MAP)) {
    for (const permissionName of permissionNames) {
      await RolePermission.findOrCreate({
        where: { roleId: roles[roleName].id, permissionId: permissions[permissionName].id },
      });
    }
  }
};

/** Wipes per-run auth data. Reference tables (roles/permissions) are left alone. */
const resetAuthTables = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await Promise.all(
    ['refresh_tokens', 'email_verification_tokens', 'user_roles'].map((table) =>
      sequelize.query(`DELETE FROM ${table}`)
    )
  );
  await sequelize.query('DELETE FROM users');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

/**
 * Wipes per-run institutional data (Chunk 04). Separate from
 * resetAuthTables since not every test file needs universities, and
 * university rows are also referenced by user_roles-adjacent fixtures in
 * some auth tests — clearing it unconditionally there would be a
 * behavior change to already-passing Chunk 03 tests.
 */
const resetInstitutionTables = async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await Promise.all(
    ['audit_logs', 'university_memberships', 'university_domains', 'programs', 'departments', 'faculties'].map(
      (table) => sequelize.query(`DELETE FROM ${table}`)
    )
  );
  await sequelize.query('DELETE FROM universities');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

/**
 * `it()` wrapper that soft-skips (warns, passes trivially) when the
 * database isn't reachable, instead of every test repeating the same
 * `if (!dbReady) return;` guard. `dbReadyGetter` reads a `let dbReady`
 * set in the test file's own `beforeAll`.
 */
const itIfDb = (dbReadyGetter) => (name, fn) => {
  it(name, async () => {
    if (!dbReadyGetter()) {
      // eslint-disable-next-line no-console
      console.warn(`Skipping "${name}" — no reachable database configured for this test run.`);
      return;
    }
    await fn();
  });
};

module.exports = { isDbAvailable, seedRbac, resetAuthTables, resetInstitutionTables, itIfDb };
