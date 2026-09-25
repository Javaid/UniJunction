const { sequelize, User, Role, UniversityMembership } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { recordAuditLog } = require('../../services/audit.service');
const { toPublicUser } = require('../../utils/userSerializer');
const { withRolesAndPermissions } = require('../auth/auth.service');
const { MEMBERSHIP_TYPE, MEMBERSHIP_STATUS, USER_STATUS } = require('../../utils/enums');

const UNIVERSITY_ADMIN_ROLE = 'UNIVERSITY_ADMIN';

/**
 * §23: assigns UNIVERSITY_ADMIN, scoped to one university. Two things
 * happen, deliberately, inside one transaction:
 *  1. An ACTIVE, ADMIN-type UniversityMembership row is ensured for
 *     (targetUser, university) — created if it doesn't exist yet. This
 *     is the "explicit service logic" the brief asks for, not an
 *     incidental side effect: it's the whole point of this endpoint,
 *     since membership is what access.service.js's
 *     `assertUniversityAccess` actually checks (role alone is global —
 *     see docs/university-management.md, "Role vs. membership").
 *  2. The global UNIVERSITY_ADMIN role is granted if the user doesn't
 *     already hold it (idempotent).
 */
const assignUniversityAdmin = async (university, targetUserUuid, actorUser) => {
  const targetUser = await User.findOne({ where: { uuid: targetUserUuid } });
  if (!targetUser) {
    throw new ApiError(404, 'User not found.');
  }
  if ([USER_STATUS.SUSPENDED, USER_STATUS.DEACTIVATED].includes(targetUser.status)) {
    throw new ApiError(409, 'Cannot assign an inactive user as a university administrator.');
  }

  await sequelize.transaction(async (transaction) => {
    const [membership] = await UniversityMembership.findOrCreate({
      where: { userId: targetUser.id, universityId: university.id, membershipType: MEMBERSHIP_TYPE.ADMIN },
      defaults: { status: MEMBERSHIP_STATUS.ACTIVE },
      transaction,
    });
    if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
      await membership.update({ status: MEMBERSHIP_STATUS.ACTIVE }, { transaction });
    }

    const adminRole = await Role.findOne({ where: { name: UNIVERSITY_ADMIN_ROLE }, transaction });
    if (!adminRole) {
      throw new ApiError(500, 'UNIVERSITY_ADMIN role is not configured.');
    }

    const alreadyHasRole = await targetUser.hasRole(adminRole, { transaction });
    if (!alreadyHasRole) {
      await targetUser.addRole(adminRole, { transaction });
    }

    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'UNIVERSITY_ADMIN_ASSIGNED',
        entityType: 'University',
        entityId: university.id,
        universityId: university.id,
        metadata: { targetUserId: targetUser.id },
      },
      { transaction }
    );
  });

  return toPublicUser(await withRolesAndPermissions(targetUser.id));
};

/** §24: sourced from membership records (the institutional fact), not just who currently holds the global role. */
const listUniversityAdmins = async (university) => {
  const memberships = await UniversityMembership.findAll({
    where: {
      universityId: university.id,
      membershipType: MEMBERSHIP_TYPE.ADMIN,
      status: MEMBERSHIP_STATUS.ACTIVE,
    },
    order: [['createdAt', 'ASC']],
  });

  // withRolesAndPermissions per user (not a plain `include: 'user'`) so
  // the response shows each admin's actual roles — a bare association
  // include doesn't eager-load roles/permissions.
  return Promise.all(
    memberships.map(async (membership) => toPublicUser(await withRolesAndPermissions(membership.userId)))
  );
};

module.exports = { assignUniversityAdmin, listUniversityAdmins };
