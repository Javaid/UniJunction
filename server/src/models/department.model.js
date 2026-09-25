const { DataTypes } = require('sequelize');
const { ORG_UNIT_STATUS } = require('../utils/enums');

/**
 * A department always belongs to a university, but `facultyId` is
 * intentionally optional: some institutions run departments directly
 * under the university with no faculty/school layer in between. Forcing
 * a faculty here would misrepresent those institutions' real structure.
 *
 * Note: enforcing that `facultyId`, when set, actually belongs to the
 * same `universityId` is a cross-row invariant a single FK can't
 * express — that check belongs in the service layer once a
 * departments API exists, not in this model.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Department',
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
      universityId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      facultyId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      shortName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(ORG_UNIT_STATUS)),
        allowNull: false,
        defaultValue: ORG_UNIT_STATUS.ACTIVE,
      },
    },
    {
      tableName: 'departments',
      paranoid: true,
      indexes: [{ fields: ['university_id'] }, { fields: ['faculty_id'] }],
    }
  );
