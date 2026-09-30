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
  'STUDENT_PROFILE_VIEW',
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
    'STUDENT_PROFILE_VIEW',
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
    'STUDENT_PROFILE_VIEW',
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

/**
 * Runs a sequence of raw statements against a single pinned connection
 * (via a real transaction) rather than sequelize.query() calls made
 * independently — which may each be handed a *different* pooled
 * connection. That distinction matters here specifically because
 * `SET FOREIGN_KEY_CHECKS = 0` is connection/session-scoped: setting it
 * on one connection and then running a DELETE on another leaves that
 * DELETE fully subject to real FK enforcement, which surfaces as a
 * flaky "foreign key constraint fails" error only under enough
 * concurrent test-suite load to exhaust the idle-connection reuse that
 * normally papers over it. Wrapping the whole sequence in one
 * transaction guarantees every statement in it runs on the same
 * connection.
 */
const runWithForeignKeyChecksDisabled = async (statements) => {
  await sequelize.transaction(async (transaction) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    for (const statement of statements) {
      await sequelize.query(statement, { transaction });
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
  });
};

/**
 * Wipes per-run student-profile data (Chunk 05). Catalog tables (skills,
 * interests, research_areas, languages) are left alone, same reasoning
 * as resetInstitutionTables leaving roles/permissions alone — they're
 * reference data, not per-test fixtures. Exported separately so a test
 * file that only touches this domain doesn't have to reset the others,
 * but resetInstitutionTables also calls it internally (see below) since
 * student_profiles now depends on universities/programs.
 */
const resetStudentProfileTables = async () => {
  await runWithForeignKeyChecksDisabled([
    'DELETE FROM student_skills',
    'DELETE FROM student_interests',
    'DELETE FROM student_research_interests',
    'DELETE FROM student_languages',
    'DELETE FROM student_certifications',
    'DELETE FROM student_achievements',
    'DELETE FROM student_goals',
    'DELETE FROM student_profiles',
  ]);
};

/** Wipes per-run auth data. Reference tables (roles/permissions) are left alone. */
const resetAuthTables = async () => {
  await runWithForeignKeyChecksDisabled([
    'DELETE FROM refresh_tokens',
    'DELETE FROM email_verification_tokens',
    'DELETE FROM user_roles',
    'DELETE FROM users',
  ]);
};

/**
 * Wipes per-run institutional data (Chunk 04). Separate from
 * resetAuthTables since not every test file needs universities, and
 * university rows are also referenced by user_roles-adjacent fixtures in
 * some auth tests — clearing it unconditionally there would be a
 * behavior change to already-passing Chunk 03 tests. Clears
 * student_profiles (Chunk 05) first — universities.id RESTRICTs a
 * student_profiles.university_id reference, so a leftover profile from
 * another test file would otherwise block `DELETE FROM universities`.
 */
const resetInstitutionTables = async () => {
  await resetStudentProfileTables();
  await runWithForeignKeyChecksDisabled([
    'DELETE FROM audit_logs',
    'DELETE FROM university_memberships',
    'DELETE FROM university_domains',
    'DELETE FROM programs',
    'DELETE FROM departments',
    'DELETE FROM faculties',
    'DELETE FROM universities',
  ]);
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

module.exports = {
  isDbAvailable,
  seedRbac,
  resetAuthTables,
  resetInstitutionTables,
  resetStudentProfileTables,
  itIfDb,
};
