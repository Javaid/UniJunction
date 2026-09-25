/**
 * Sequelize model registry and association wiring.
 *
 * Chunk 02 scope: Identity (User, Role, UserRole) and Institution
 * (University, Faculty, Department, Program).
 * Chunk 03 scope: RBAC (Permission, RolePermission) and auth token
 * storage (RefreshToken, EmailVerificationToken). See
 * docs/database-guidelines.md for future domains.
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
};
