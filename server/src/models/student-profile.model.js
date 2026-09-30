const { DataTypes } = require('sequelize');
const {
  ACADEMIC_STATUS,
  PROFILE_VISIBILITY,
  AVAILABILITY_STATUS,
} = require('../utils/enums');

/**
 * The Student Academic Profile — see docs/student-profiles.md for the
 * full domain design. Deliberately separate from `users` (identity only)
 * and from `university_memberships` (which remains the authoritative
 * record of institutional affiliation — see "Student <-> University" in
 * docs/student-profiles.md). This table holds academic-identity detail
 * that belongs to neither: program, semester, bio, visibility, and so on.
 *
 * `userId` is unique — a user has at most one student profile in this
 * chunk (see docs/student-profiles.md, "Student <-> User"). `paranoid`
 * is enabled for consistency with the rest of this domain and to keep a
 * removed profile's history inspectable, even though no delete endpoint
 * exists yet; note this means the unique constraint applies to the row
 * forever, including after a soft delete (there is no re-creation path
 * in this chunk — see the docs for the known limitation this implies).
 *
 * `studentIdentifier` is sensitive institutional data (§3): never
 * serialized to a public viewer, only to the owner and to the relevant
 * institution's admins — see `student-profile.serializer.js`. It is
 * unique per-university (not globally), since a student number is only
 * guaranteed unique within its issuing institution.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'StudentProfile',
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
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
      },
      universityId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      programId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      studentIdentifier: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      admissionYear: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: true,
      },
      expectedGraduationYear: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: true,
      },
      // TINYINT UNSIGNED (0-255 at the DB layer) so the database is never
      // the thing standing in the way of a legitimate long-duration or
      // part-time program — see docs/student-profiles.md, "Current
      // semester", for why the real ceiling (a generous but finite range)
      // is enforced only in the Joi validator, not here.
      currentSemester: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: true,
      },
      academicStatus: {
        type: DataTypes.ENUM(...Object.values(ACADEMIC_STATUS)),
        allowNull: false,
        defaultValue: ACADEMIC_STATUS.ACTIVE,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      headline: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      // Defaults to ACADEMIC_NETWORK, not PUBLIC or PRIVATE — a
      // deliberate middle ground documented in docs/student-profiles.md,
      // "Visibility": visible to any authenticated platform member
      // (supporting cross-university discovery) without being exposed to
      // the open internet by default.
      profileVisibility: {
        type: DataTypes.ENUM(...Object.values(PROFILE_VISIBILITY)),
        allowNull: false,
        defaultValue: PROFILE_VISIBILITY.ACADEMIC_NETWORK,
      },
      availabilityStatus: {
        type: DataTypes.ENUM(...Object.values(AVAILABILITY_STATUS)),
        allowNull: false,
        defaultValue: AVAILABILITY_STATUS.NOT_SPECIFIED,
      },
    },
    {
      tableName: 'student_profiles',
      paranoid: true,
      indexes: [
        { fields: ['university_id'] },
        { fields: ['program_id'] },
        { fields: ['academic_status'] },
        { fields: ['availability_status'] },
        // Composite: the admin student-list endpoint's primary access
        // pattern is "this university's students, filtered by status" —
        // see docs/student-profiles.md, "Indexing decisions".
        { fields: ['university_id', 'academic_status'] },
        { unique: true, fields: ['university_id', 'student_identifier'] },
      ],
    }
  );
