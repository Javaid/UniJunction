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

// Institutional verification is a separate dimension from
// universities.status (operational state) — see
// docs/university-management.md, "University lifecycle". Performed only
// by a SUPER_ADMIN in this chunk; no external verification integration.
const VERIFICATION_STATUS = Object.freeze({
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
});

// What a user IS to a university, independent of platform role — see
// docs/university-management.md, "Role vs. membership".
const MEMBERSHIP_TYPE = Object.freeze({
  STUDENT: 'STUDENT',
  FACULTY: 'FACULTY',
  RESEARCHER: 'RESEARCHER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
});

const MEMBERSHIP_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  ENDED: 'ENDED',
});

// Program degree levels: VARCHAR at the DB layer (not an ENUM — see
// program.model.js), validated against this allow-list at the API
// boundary. New levels are added here (and to database/seed data if a
// UI dropdown needs seeding) — never require a schema migration, since
// the column itself is already an open VARCHAR(30).
const DEGREE_LEVELS = Object.freeze([
  'CERTIFICATE',
  'DIPLOMA',
  'ASSOCIATE',
  'BACHELOR',
  'MASTER',
  'MS',
  'MPHIL',
  'PHD',
]);

// A student profile's institutional/enrollment state — see
// docs/student-profiles.md, "Academic status". Changed only via the
// dedicated PATCH .../status endpoint, never via the general profile
// update, mirroring the university/faculty/department/program status
// pattern from Chunk 04.
const ACADEMIC_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  GRADUATED: 'GRADUATED',
  SUSPENDED: 'SUSPENDED',
  WITHDRAWN: 'WITHDRAWN',
});

// Who may see a student profile, owner-controlled but never able to
// override institutional/legal access (SUPER_ADMIN and the student's own
// UNIVERSITY_ADMIN always retain access) — see
// docs/student-profiles.md, "Visibility".
const PROFILE_VISIBILITY = Object.freeze({
  PUBLIC: 'PUBLIC',
  ACADEMIC_NETWORK: 'ACADEMIC_NETWORK',
  UNIVERSITY_ONLY: 'UNIVERSITY_ONLY',
  CONNECTIONS_ONLY: 'CONNECTIONS_ONLY',
  PRIVATE: 'PRIVATE',
});

// Self-reported openness to collaboration — a future signal for
// project/research matching, not built in this chunk.
const AVAILABILITY_STATUS = Object.freeze({
  NOT_SPECIFIED: 'NOT_SPECIFIED',
  AVAILABLE: 'AVAILABLE',
  LIMITED: 'LIMITED',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
});

// Self-reported skill level — never a certified qualification unless a
// future chunk adds verification. See docs/student-profiles.md, "Skills".
const SKILL_PROFICIENCY = Object.freeze({
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  EXPERT: 'EXPERT',
});

// Starting, extensible vocabulary for skills.category — enforced by the
// Joi validator, not a DB constraint (skills.category is VARCHAR), so a
// new category never requires a migration.
const SKILL_CATEGORIES = Object.freeze([
  'PROGRAMMING',
  'DATABASE',
  'AI_ML',
  'CLOUD',
  'WEB',
  'MOBILE',
  'DESIGN',
  'DATA',
  'RESEARCH',
  'BUSINESS',
  'COMMUNICATION',
  'OTHER',
]);

// Shared ACTIVE/INACTIVE lifecycle for the platform-wide catalog tables
// (skills, interests, research_areas, languages). Deliberately a
// separate enum from ORG_UNIT_STATUS even though the values are
// identical — ORG_UNIT_STATUS is for per-university academic structures
// toggled by university admins; catalog entries are global and
// platform-admin-managed. Conflating the two would make a future,
// legitimate divergence (e.g. a catalog-only "DEPRECATED" state) an
// awkward retrofit.
const CATALOG_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

// Self-described depth of interest in a research area — not an academic
// qualification. See docs/student-profiles.md, "Research interests".
const RESEARCH_INTEREST_LEVEL = Object.freeze({
  CURIOUS: 'CURIOUS',
  INTERESTED: 'INTERESTED',
  ACTIVE: 'ACTIVE',
  ADVANCED: 'ADVANCED',
});

const LANGUAGE_PROFICIENCY = Object.freeze({
  BASIC: 'BASIC',
  CONVERSATIONAL: 'CONVERSATIONAL',
  PROFESSIONAL: 'PROFESSIONAL',
  FLUENT: 'FLUENT',
  NATIVE: 'NATIVE',
});

const GOAL_TYPE = Object.freeze({
  RESEARCH: 'RESEARCH',
  MENTORSHIP: 'MENTORSHIP',
  INTERNSHIP: 'INTERNSHIP',
  PROJECT: 'PROJECT',
  SCHOLARSHIP: 'SCHOLARSHIP',
  GRADUATE_STUDY: 'GRADUATE_STUDY',
  CAREER: 'CAREER',
  COMPETITION: 'COMPETITION',
  OTHER: 'OTHER',
});

const GOAL_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
});

module.exports = {
  USER_STATUS,
  UNIVERSITY_STATUS,
  ORG_UNIT_STATUS,
  INITIAL_ROLE_NAMES,
  VERIFICATION_STATUS,
  MEMBERSHIP_TYPE,
  MEMBERSHIP_STATUS,
  DEGREE_LEVELS,
  ACADEMIC_STATUS,
  PROFILE_VISIBILITY,
  AVAILABILITY_STATUS,
  SKILL_PROFICIENCY,
  SKILL_CATEGORIES,
  CATALOG_STATUS,
  RESEARCH_INTEREST_LEVEL,
  LANGUAGE_PROFICIENCY,
  GOAL_TYPE,
  GOAL_STATUS,
};
