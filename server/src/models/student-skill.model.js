const { DataTypes } = require('sequelize');
const { SKILL_PROFICIENCY } = require('../utils/enums');

/**
 * Join table: a student's self-reported skill and proficiency — see
 * docs/student-profiles.md, "Skills". A pure relational fact (like
 * `user_roles`), so no `uuid` and no soft delete: removing a skill from
 * a profile just removes the row. `proficiencyLevel` is explicitly
 * self-reported, never a certified qualification (see enums.js).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'StudentSkill',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      studentProfileId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      skillId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      proficiencyLevel: {
        type: DataTypes.ENUM(...Object.values(SKILL_PROFICIENCY)),
        allowNull: false,
        defaultValue: SKILL_PROFICIENCY.BEGINNER,
      },
      yearsExperience: {
        type: DataTypes.DECIMAL(3, 1).UNSIGNED,
        allowNull: true,
      },
    },
    {
      tableName: 'student_skills',
      indexes: [
        { unique: true, fields: ['student_profile_id', 'skill_id'] },
        { fields: ['skill_id'] },
      ],
    }
  );
