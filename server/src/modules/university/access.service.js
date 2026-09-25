const { UniversityMembership } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { MEMBERSHIP_TYPE, MEMBERSHIP_STATUS } = require('../../utils/enums');

/**
 * The reusable university-scoped authorization service (chunk brief
 * §28). Every write-scoped, university-owned endpoint calls one of these
 * instead of re-implementing "is this admin allowed to touch this
 * university" in its own controller — see
 * docs/university-management.md, "Resource ownership & authorization".
 *
 * This resolves the chain the brief describes:
 *   Authenticated User -> Role -> University Membership -> Requested University
 *
 * Read access (viewing universities/faculties/departments/programs) is
 * NOT scoped this way — it's open, per the platform's cross-university
 * discoverability principle (docs/database-guidelines.md §9). Only
 * mutating operations call `assertUniversityAccess`.
 */

/**
 * Throws 403 unless `user` may manage the given university.
 * - SUPER_ADMIN: unrestricted (no membership required — chunk brief §6).
 * - UNIVERSITY_ADMIN: only if they hold an ACTIVE, ADMIN-type membership
 *   at that specific university (established via §23's admin-assignment
 *   flow, not inferred from the role alone — role and membership are
 *   independent, see docs/university-management.md).
 * - Anyone else: denied.
 */
const assertUniversityAccess = async (user, universityId) => {
  if (user.roles.includes('SUPER_ADMIN')) {
    return;
  }

  if (user.roles.includes('UNIVERSITY_ADMIN')) {
    const membership = await UniversityMembership.findOne({
      where: {
        userId: user.internalId,
        universityId,
        membershipType: MEMBERSHIP_TYPE.ADMIN,
        status: MEMBERSHIP_STATUS.ACTIVE,
      },
    });
    if (membership) {
      return;
    }
  }

  throw new ApiError(403, 'You do not have access to this university.');
};

/**
 * Throws when a related resource (e.g. the department a program is
 * being attached to) does not actually belong to the university it's
 * being used under. Guards against a client supplying a `department_id`
 * or `faculty_id` that's real but belongs to a different institution —
 * see chunk brief §18/§31, "never rely only on a client-provided id."
 */
const assertResourceBelongsToUniversity = (resource, universityId, entityName = 'Resource') => {
  if (!resource || Number(resource.universityId) !== Number(universityId)) {
    throw new ApiError(400, `${entityName} does not belong to the specified university.`);
  }
};

module.exports = { assertUniversityAccess, assertResourceBelongsToUniversity };
