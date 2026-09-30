const { UniversityMembership, University, Program } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { MEMBERSHIP_TYPE, MEMBERSHIP_STATUS, UNIVERSITY_STATUS } = require('../../utils/enums');
const { assertUniversityAccess } = require('../university/access.service');

/**
 * §38/§39: only a user with an active *student context* may create a
 * student profile — the STUDENT role alone is not enough (it is global,
 * see docs/university-management.md, "Role vs. membership"), nor is
 * membership alone (a STAFF or ADMIN membership doesn't make someone a
 * student). Both must line up for the SAME university being claimed.
 */
const assertActiveStudentMembership = async (user, universityId) => {
  if (!user.roles.includes('STUDENT')) {
    throw new ApiError(403, 'Only users with the STUDENT role may create a student profile.');
  }

  const membership = await UniversityMembership.findOne({
    where: {
      userId: user.internalId,
      universityId,
      membershipType: MEMBERSHIP_TYPE.STUDENT,
      status: MEMBERSHIP_STATUS.ACTIVE,
    },
  });

  if (!membership) {
    throw new ApiError(403, 'You do not have an active student membership at this university.');
  }

  return membership;
};

/** §39: the target university must exist and be operationally active. */
const assertUniversityIsActive = async (universityUuid) => {
  const university = await University.findOne({ where: { uuid: universityUuid } });
  if (!university) {
    throw new ApiError(404, 'University not found.');
  }
  if (university.status !== UNIVERSITY_STATUS.ACTIVE) {
    throw new ApiError(400, 'This university is not currently active.');
  }
  return university;
};

/**
 * §6/§39: a program may only be attached if it exists, is ACTIVE, and
 * belongs to the SAME university as the profile — never a legitimate
 * cross-institution reference in this chunk (reject the scenario
 * entirely, per the brief). Returns null if no program was supplied.
 */
const resolveActiveProgramForUniversity = async (programUuid, universityId) => {
  if (!programUuid) return null;

  const program = await Program.findOne({ where: { uuid: programUuid } });
  if (!program) {
    throw new ApiError(404, 'Program not found.');
  }
  if (Number(program.universityId) !== Number(universityId)) {
    throw new ApiError(400, 'Program does not belong to the selected university.');
  }
  if (program.status !== 'ACTIVE') {
    throw new ApiError(400, 'Program is not currently active.');
  }
  return program;
};

module.exports = {
  assertActiveStudentMembership,
  assertUniversityIsActive,
  resolveActiveProgramForUniversity,
  // Re-exported for convenience — admin-scoped student endpoints reuse
  // the same university-scoped authorization service as Chunk 04 rather
  // than duplicating it (see docs/student-profiles.md, "Authorization").
  assertUniversityAccess,
};
