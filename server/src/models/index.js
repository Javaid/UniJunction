/**
 * Sequelize model registry and association wiring.
 *
 * Chunk 02 scope only: Identity (User, Role, UserRole) and Institution
 * (University, Faculty, Department, Program). See
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

const User = defineUser(sequelize);
const Role = defineRole(sequelize);
const UserRole = defineUserRole(sequelize);
const University = defineUniversity(sequelize);
const Faculty = defineFaculty(sequelize);
const Department = defineDepartment(sequelize);
const Program = defineProgram(sequelize);

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

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  University,
  Faculty,
  Department,
  Program,
};
