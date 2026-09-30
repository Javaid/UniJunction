const { DataTypes } = require('sequelize');
const { LANGUAGE_PROFICIENCY } = require('../utils/enums');

/**
 * Join table: a language a student speaks and its proficiency — see
 * docs/student-profiles.md, "Languages". Pure relational fact, same
 * reasoning as `StudentSkill` (no `uuid`, no soft delete).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'StudentLanguage',
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
      languageId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      proficiencyLevel: {
        type: DataTypes.ENUM(...Object.values(LANGUAGE_PROFICIENCY)),
        allowNull: false,
        defaultValue: LANGUAGE_PROFICIENCY.CONVERSATIONAL,
      },
    },
    {
      tableName: 'student_languages',
      indexes: [
        { unique: true, fields: ['student_profile_id', 'language_id'] },
        { fields: ['language_id'] },
      ],
    }
  );
