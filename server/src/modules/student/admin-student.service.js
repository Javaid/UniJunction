const { Op } = require('sequelize');
const { StudentProfile, Program } = require('../../models');
const ApiError = require('../../utils/ApiError');

/**
 * §35: the admin student-list foundation. Deliberately a lightweight
 * summary, not the full profile — never includes `student_identifier`,
 * email, phone, or any other field flagged sensitive in
 * docs/student-profiles.md. An admin who needs the full institutional
 * detail follows `id` to `GET /api/students/:id/profile`, where the
 * existing institutional-admin bypass (see student-profile.serializer.js)
 * grants the admin tier regardless of the student's own visibility
 * setting.
 */
const serializeStudentSummary = (profile) => {
  const plain = profile.toJSON ? profile.toJSON() : profile;
  return {
    id: plain.uuid,
    user: {
      first_name: plain.user.firstName,
      last_name: plain.user.lastName,
      display_name: plain.user.displayName,
    },
    program: plain.program ? { id: plain.program.uuid, name: plain.program.name, degree_level: plain.program.degreeLevel } : null,
    headline: plain.headline,
    academic_status: plain.academicStatus,
    availability_status: plain.availabilityStatus,
  };
};

/** §35: SUPER_ADMIN sees any university (route already resolved `university` via requireUniversityAccess); a UNIVERSITY_ADMIN only ever reaches here for their own. */
const listUniversityStudents = async (
  university,
  { page, pageSize, search, program_id: programUuid, academic_status: academicStatus }
) => {
  const where = { universityId: university.id };
  if (academicStatus) where.academicStatus = academicStatus;

  if (programUuid) {
    const program = await Program.findOne({ where: { uuid: programUuid, universityId: university.id } });
    if (!program) {
      throw new ApiError(404, 'Program not found.');
    }
    where.programId = program.id;
  }

  const include = [
    {
      association: 'user',
      ...(search
        ? {
            where: {
              [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { displayName: { [Op.like]: `%${search}%` } },
              ],
            },
          }
        : {}),
    },
    { association: 'program' },
  ];

  const { rows, count } = await StudentProfile.findAndCountAll({
    where,
    include,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['createdAt', 'DESC']],
    // A search filter lives on the joined `user`, not this table — an
    // INNER JOIN (Sequelize's default when a nested `where` is present)
    // is required so pagination counts only actually-matching rows.
    subQuery: false,
  });

  return {
    students: rows.map(serializeStudentSummary),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 0 },
  };
};

module.exports = { listUniversityStudents };
