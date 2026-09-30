/**
 * Sequelize model registry and association wiring.
 *
 * Chunk 02 scope: Identity (User, Role, UserRole) and Institution
 * (University, Faculty, Department, Program).
 * Chunk 03 scope: RBAC (Permission, RolePermission) and auth token
 * storage (RefreshToken, EmailVerificationToken).
 * Chunk 04 scope: Institutional administration (UniversityDomain,
 * UniversityMembership, AuditLog).
 * Chunk 05 scope: Student Academic Profile (StudentProfile, the Skill/
 * Interest/ResearchArea/Language catalogs and their per-student join
 * tables, StudentCertification, StudentAchievement, StudentGoal) — see
 * docs/student-profiles.md. See docs/database-guidelines.md for future
 * domains.
 *
 * IMPORTANT: this module never calls sequelize.sync(). Schema is created
 * and changed exclusively through /database/schema.sql (and, later, a
 * proper migration tool) — see docs/database-guidelines.md, section
 * "Production migration strategy".
 */
const { sequelize } = require('../config/database');

const defineUser = require('./user.model');
const defineRole = require('./role.model');
const defineUserRole = require('./user-role.model');
const defineUniversity = require('./university.model');
const defineFaculty = require('./faculty.model');
const defineDepartment = require('./department.model');
const defineProgram = require('./program.model');
const definePermission = require('./permission.model');
const defineRolePermission = require('./role-permission.model');
const defineRefreshToken = require('./refresh-token.model');
const defineEmailVerificationToken = require('./email-verification-token.model');
const defineUniversityDomain = require('./university-domain.model');
const defineUniversityMembership = require('./university-membership.model');
const defineAuditLog = require('./audit-log.model');
const defineStudentProfile = require('./student-profile.model');
const defineSkill = require('./skill.model');
const defineStudentSkill = require('./student-skill.model');
const defineInterest = require('./interest.model');
const defineStudentInterest = require('./student-interest.model');
const defineResearchArea = require('./research-area.model');
const defineStudentResearchInterest = require('./student-research-interest.model');
const defineLanguage = require('./language.model');
const defineStudentLanguage = require('./student-language.model');
const defineStudentCertification = require('./student-certification.model');
const defineStudentAchievement = require('./student-achievement.model');
const defineStudentGoal = require('./student-goal.model');

const User = defineUser(sequelize);
const Role = defineRole(sequelize);
const UserRole = defineUserRole(sequelize);
const University = defineUniversity(sequelize);
const Faculty = defineFaculty(sequelize);
const Department = defineDepartment(sequelize);
const Program = defineProgram(sequelize);
const Permission = definePermission(sequelize);
const RolePermission = defineRolePermission(sequelize);
const RefreshToken = defineRefreshToken(sequelize);
const EmailVerificationToken = defineEmailVerificationToken(sequelize);
const UniversityDomain = defineUniversityDomain(sequelize);
const UniversityMembership = defineUniversityMembership(sequelize);
const AuditLog = defineAuditLog(sequelize);
const StudentProfile = defineStudentProfile(sequelize);
const Skill = defineSkill(sequelize);
const StudentSkill = defineStudentSkill(sequelize);
const Interest = defineInterest(sequelize);
const StudentInterest = defineStudentInterest(sequelize);
const ResearchArea = defineResearchArea(sequelize);
const StudentResearchInterest = defineStudentResearchInterest(sequelize);
const Language = defineLanguage(sequelize);
const StudentLanguage = defineStudentLanguage(sequelize);
const StudentCertification = defineStudentCertification(sequelize);
const StudentAchievement = defineStudentAchievement(sequelize);
const StudentGoal = defineStudentGoal(sequelize);

// ---- Identity: User <-> Role (many-to-many via UserRole) ----------------
// A pure join table, so both sides cascade if a user or role is ever
// hard-deleted (see docs/database-guidelines.md, "Foreign key strategy").
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'userId',
  otherKey: 'roleId',
  as: 'roles',
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'roleId',
  otherKey: 'userId',
  as: 'users',
});
User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles', onDelete: 'CASCADE' });
Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'roleAssignments', onDelete: 'CASCADE' });
UserRole.belongsTo(User, { foreignKey: 'userId' });
UserRole.belongsTo(Role, { foreignKey: 'roleId' });

// ---- Institution hierarchy ------------------------------------------------
// University deletion never cascades into its academic hierarchy — see
// docs/database-guidelines.md, "Foreign key strategy". RESTRICT forces a
// deliberate teardown (or, in practice, a soft-delete) instead.
University.hasMany(Faculty, { foreignKey: 'universityId', as: 'faculties', onDelete: 'RESTRICT' });
Faculty.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

University.hasMany(Department, {
  foreignKey: 'universityId',
  as: 'departments',
  onDelete: 'RESTRICT',
});
Department.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

// facultyId is optional on Department, so losing the faculty just clears
// the reference rather than blocking or cascading.
Faculty.hasMany(Department, { foreignKey: 'facultyId', as: 'departments', onDelete: 'SET NULL' });
Department.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

University.hasMany(Program, { foreignKey: 'universityId', as: 'programs', onDelete: 'RESTRICT' });
Program.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

Faculty.hasMany(Program, { foreignKey: 'facultyId', as: 'programs', onDelete: 'SET NULL' });
Program.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

// departmentId is required on Program, so a department with programs
// cannot be removed out from under them.
Department.hasMany(Program, {
  foreignKey: 'departmentId',
  as: 'programs',
  onDelete: 'RESTRICT',
});
Program.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// ---- RBAC: Role <-> Permission (many-to-many via RolePermission) --------
// Pure join table, same cascade reasoning as UserRole.
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles',
});
Role.hasMany(RolePermission, { foreignKey: 'roleId', as: 'rolePermissions', onDelete: 'CASCADE' });
Permission.hasMany(RolePermission, {
  foreignKey: 'permissionId',
  as: 'permissionAssignments',
  onDelete: 'CASCADE',
});
RolePermission.belongsTo(Role, { foreignKey: 'roleId' });
RolePermission.belongsTo(Permission, { foreignKey: 'permissionId' });

// ---- Auth tokens: per-user, hard-deleted with their user ------------------
// Not institutional entities — see docs/database-guidelines.md, "Foreign
// key strategy". CASCADE mirrors the UserRole precedent.
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(EmailVerificationToken, {
  foreignKey: 'userId',
  as: 'emailVerificationTokens',
  onDelete: 'CASCADE',
});
EmailVerificationToken.belongsTo(User, { foreignKey: 'userId' });

// ---- Institutional membership & domains (Chunk 04) -------------------------
// A university with domains/memberships attached can't be hard-deleted
// out from under them (RESTRICT) — same policy as faculties/departments/
// programs. A user's own memberships are per-user artifacts and cascade
// with the user (CASCADE) — same policy as user_roles/refresh_tokens.
University.hasMany(UniversityDomain, {
  foreignKey: 'universityId',
  as: 'domains',
  onDelete: 'RESTRICT',
});
UniversityDomain.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

University.hasMany(UniversityMembership, {
  foreignKey: 'universityId',
  as: 'memberships',
  onDelete: 'RESTRICT',
});
UniversityMembership.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

User.hasMany(UniversityMembership, {
  foreignKey: 'userId',
  as: 'universityMemberships',
  onDelete: 'CASCADE',
});
UniversityMembership.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ---- Audit trail (Chunk 04) -------------------------------------------------
// An append-only log entry survives its actor or university being
// removed — SET NULL keeps the historical record instead of losing it.
User.hasMany(AuditLog, { foreignKey: 'actorUserId', as: 'auditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

University.hasMany(AuditLog, { foreignKey: 'universityId', as: 'auditLogs', onDelete: 'SET NULL' });
AuditLog.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

// ---- Student Academic Profile (Chunk 05) -----------------------------------
// A profile is a per-user artifact, so it cascades with its user (same
// policy as refresh_tokens/university_memberships). Its university/
// program references follow the institutional-hierarchy precedent:
// RESTRICT on university (never let a careless hard delete take a
// student's academic record down with it), SET NULL on the optional
// program (mirrors Faculty -> Department/Program).
User.hasOne(StudentProfile, { foreignKey: 'userId', as: 'studentProfile', onDelete: 'CASCADE' });
StudentProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

University.hasMany(StudentProfile, {
  foreignKey: 'universityId',
  as: 'studentProfiles',
  onDelete: 'RESTRICT',
});
StudentProfile.belongsTo(University, { foreignKey: 'universityId', as: 'university' });

Program.hasMany(StudentProfile, { foreignKey: 'programId', as: 'studentProfiles', onDelete: 'SET NULL' });
StudentProfile.belongsTo(Program, { foreignKey: 'programId', as: 'program' });

// ---- Skills: reusable catalog + per-student join (Chunk 05) ----------------
// Both sides CASCADE, same reasoning as user_roles/role_permissions —
// these are pure relational-fact join rows, not institutional records
// that need protecting from an upstream deletion.
StudentProfile.hasMany(StudentSkill, {
  foreignKey: 'studentProfileId',
  as: 'studentSkills',
  onDelete: 'CASCADE',
});
StudentSkill.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'studentProfile' });
Skill.hasMany(StudentSkill, { foreignKey: 'skillId', as: 'studentSkills', onDelete: 'CASCADE' });
StudentSkill.belongsTo(Skill, { foreignKey: 'skillId', as: 'skill' });

// ---- Academic interests: catalog + per-student join (Chunk 05) ------------
StudentProfile.hasMany(StudentInterest, {
  foreignKey: 'studentProfileId',
  as: 'studentInterests',
  onDelete: 'CASCADE',
});
StudentInterest.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'studentProfile' });
Interest.hasMany(StudentInterest, { foreignKey: 'interestId', as: 'studentInterests', onDelete: 'CASCADE' });
StudentInterest.belongsTo(Interest, { foreignKey: 'interestId', as: 'interest' });

// ---- Research areas: hierarchical catalog + per-student join (Chunk 05) ---
ResearchArea.belongsTo(ResearchArea, { foreignKey: 'parentId', as: 'parent' });
ResearchArea.hasMany(ResearchArea, { foreignKey: 'parentId', as: 'children', onDelete: 'SET NULL' });

StudentProfile.hasMany(StudentResearchInterest, {
  foreignKey: 'studentProfileId',
  as: 'studentResearchInterests',
  onDelete: 'CASCADE',
});
StudentResearchInterest.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'studentProfile' });
ResearchArea.hasMany(StudentResearchInterest, {
  foreignKey: 'researchAreaId',
  as: 'studentResearchInterests',
  onDelete: 'CASCADE',
});
StudentResearchInterest.belongsTo(ResearchArea, { foreignKey: 'researchAreaId', as: 'researchArea' });

// ---- Languages: catalog + per-student join (Chunk 05) ---------------------
StudentProfile.hasMany(StudentLanguage, {
  foreignKey: 'studentProfileId',
  as: 'studentLanguages',
  onDelete: 'CASCADE',
});
StudentLanguage.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'studentProfile' });
Language.hasMany(StudentLanguage, { foreignKey: 'languageId', as: 'studentLanguages', onDelete: 'CASCADE' });
StudentLanguage.belongsTo(Language, { foreignKey: 'languageId', as: 'language' });

// ---- Certifications, achievements, goals (Chunk 05) ------------------------
// Standalone, owned exclusively by their profile — CASCADE mirrors the
// per-user-artifact precedent (refresh_tokens, university_memberships).
StudentProfile.hasMany(StudentCertification, {
  foreignKey: 'studentProfileId',
  as: 'certifications',
  onDelete: 'CASCADE',
});
StudentCertification.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'studentProfile' });

StudentProfile.hasMany(StudentAchievement, {
  foreignKey: 'studentProfileId',
  as: 'achievements',
  onDelete: 'CASCADE',
});
StudentAchievement.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'studentProfile' });

StudentProfile.hasMany(StudentGoal, { foreignKey: 'studentProfileId', as: 'goals', onDelete: 'CASCADE' });
StudentGoal.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'studentProfile' });

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  University,
  Faculty,
  Department,
  Program,
  Permission,
  RolePermission,
  RefreshToken,
  EmailVerificationToken,
  UniversityDomain,
  UniversityMembership,
  AuditLog,
  StudentProfile,
  Skill,
  StudentSkill,
  Interest,
  StudentInterest,
  ResearchArea,
  StudentResearchInterest,
  Language,
  StudentLanguage,
  StudentCertification,
  StudentAchievement,
  StudentGoal,
};
