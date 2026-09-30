const { DataTypes } = require('sequelize');
const { RESEARCH_INTEREST_LEVEL } = require('../utils/enums');

/**
 * Join table: a student's self-described interest in a research area —
 * see docs/student-profiles.md, "Research interests". `interestLevel` is
 * self-described, never an academic qualification (see enums.js).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'StudentResearchInterest',
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
      researchAreaId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      interestLevel: {
        type: DataTypes.ENUM(...Object.values(RESEARCH_INTEREST_LEVEL)),
        allowNull: false,
        defaultValue: RESEARCH_INTEREST_LEVEL.CURIOUS,
      },
    },
    {
      tableName: 'student_research_interests',
      indexes: [
        { unique: true, fields: ['student_profile_id', 'research_area_id'] },
        { fields: ['research_area_id'] },
      ],
    }
  );
