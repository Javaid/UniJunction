const { DataTypes } = require('sequelize');
const { CATALOG_STATUS } = require('../utils/enums');

/**
 * A normalized, reusable skill catalog entry (e.g. "Python", "React") —
 * see docs/student-profiles.md, "Skills". Deliberately NOT a free-text
 * field on the student profile; students attach skills through the
 * `student_skills` join table so the same skill is never duplicated
 * under slightly different spellings.
 *
 * Has a `uuid` (unlike `roles`/`permissions`, which are addressed by
 * `name`) because skills ARE addressed directly from a URL
 * (`/api/students/me/skills/:skillId`) — see database-guidelines.md §4
 * for the general rule this follows.
 *
 * No `deleted_at` — retiring a skill from the catalog is expressed by
 * `status: INACTIVE`, not a soft delete, since existing `student_skills`
 * rows referencing it must remain meaningful history, not "restorable."
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Skill',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      category: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(CATALOG_STATUS)),
        allowNull: false,
        defaultValue: CATALOG_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'skills',
      indexes: [{ fields: ['category'] }, { fields: ['status'] }],
    }
  );
