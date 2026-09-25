/**
 * Shared enumerations for controlled (but domain-stable) status fields.
 *
 * These back MySQL ENUM columns, which is appropriate only for closed,
 * rarely-changing vocabularies. Role names and program degree levels are
 * intentionally NOT enums here — see docs/database-guidelines.md for why
 * those are open-ended VARCHAR values instead.
 */
const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

const UNIVERSITY_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

// Shared by faculties, departments, and programs: internal academic
// structures toggled on/off by university admins, not moderated entities.
const ORG_UNIT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

// Documented starting vocabulary for roles.name — enforced by the Joi
// validator when a role is created, not by a DB constraint, since the
// role system must remain extensible without a schema migration.
const INITIAL_ROLE_NAMES = Object.freeze([
  'SUPER_ADMIN',
  'UNIVERSITY_ADMIN',
  'FACULTY',
  'RESEARCHER',
  'STUDENT',
]);

module.exports = { USER_STATUS, UNIVERSITY_STATUS, ORG_UNIT_STATUS, INITIAL_ROLE_NAMES };
