const { Op } = require('sequelize');
const { sequelize, User, UniversityMembership } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { recordAuditLog } = require('../../services/audit.service');
const { toPublicUser } = require('../../utils/userSerializer');
const { MEMBERSHIP_STATUS } = require('../../utils/enums');

const serializeMembership = (membership, universityUuid) => {
  const plain = membership.toJSON ? membership.toJSON() : membership;
  return {
    id: plain.uuid,
    university_id: universityUuid || plain.university?.uuid,
    user: plain.user ? toPublicUser(plain.user) : undefined,
    membership_type: plain.membershipType,
    status: plain.status,
    is_primary: plain.isPrimary,
    joined_at: plain.joinedAt,
    left_at: plain.leftAt,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

// A bare `{ association: 'user' }` doesn't eager-load the user's roles,
// which toPublicUser needs to show them accurately — nest it explicitly.
const USER_WITH_ROLES = { association: 'user', include: [{ association: 'roles' }] };

const findByPublicId = async (membershipUuid) => {
  const membership = await UniversityMembership.findOne({
    where: { uuid: membershipUuid },
    include: [{ association: 'university' }, USER_WITH_ROLES],
  });
  if (!membership) {
    throw new ApiError(404, 'Membership not found.');
  }
  return membership;
};

/**
 * §4: "Only one active primary membership should exist per user" —
 * enforced here (service layer) rather than a DB constraint, since MySQL
 * has no partial/filtered unique index to express it directly.
 */
const setPrimaryExclusively = async (userId, membershipIdToKeep, { transaction }) => {
  await UniversityMembership.update(
    { isPrimary: false },
    { where: { userId, isPrimary: true, id: { [Op.ne]: membershipIdToKeep } }, transaction }
  );
};

const listMemberships = async (university, { page, pageSize, status, membership_type: membershipType }) => {
  const where = { universityId: university.id };
  if (status) where.status = status;
  if (membershipType) where.membershipType = membershipType;

  const { rows, count } = await UniversityMembership.findAndCountAll({
    where,
    include: [USER_WITH_ROLES],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['createdAt', 'DESC']],
  });

  return {
    memberships: rows.map((m) => serializeMembership(m, university.uuid)),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 0 },
  };
};

/** §26: admin-level membership creation. Does not implement full onboarding — just the record. */
const createMembership = async (university, payload, actorUser) => {
  const targetUser = await User.findOne({ where: { uuid: payload.user_id } });
  if (!targetUser) {
    throw new ApiError(404, 'User not found.');
  }

  const existing = await UniversityMembership.findOne({
    where: { userId: targetUser.id, universityId: university.id, membershipType: payload.membership_type },
  });
  if (existing) {
    throw new ApiError(409, 'This user already has a membership of this type at this university.');
  }

  let membership;
  try {
    await sequelize.transaction(async (transaction) => {
      membership = await UniversityMembership.create(
        {
          userId: targetUser.id,
          universityId: university.id,
          membershipType: payload.membership_type,
          status: payload.status || MEMBERSHIP_STATUS.PENDING,
          isPrimary: Boolean(payload.is_primary),
        },
        { transaction }
      );

      if (payload.is_primary) {
        await setPrimaryExclusively(targetUser.id, membership.id, { transaction });
      }

      await recordAuditLog(
        {
          actorUserId: actorUser.internalId,
          action: 'MEMBERSHIP_CREATED',
          entityType: 'UniversityMembership',
          entityId: membership.id,
          universityId: university.id,
          metadata: { userId: targetUser.id, membershipType: payload.membership_type },
        },
        { transaction }
      );
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'This user already has a membership of this type at this university.');
    }
    throw error;
  }

  return serializeMembership(await findByPublicId(membership.uuid));
};

/** §31: the membership must actually belong to `university` (from the URL) — never trust the ID alone. */
const updateMembership = async (university, membershipUuid, payload, actorUser) => {
  const membership = await findByPublicId(membershipUuid);
  if (Number(membership.universityId) !== Number(university.id)) {
    throw new ApiError(404, 'Membership not found.');
  }

  const previousStatus = membership.status;
  const changes = {};
  if (payload.status !== undefined) {
    changes.status = payload.status;
    if (payload.status === MEMBERSHIP_STATUS.ENDED && !membership.leftAt) {
      changes.leftAt = new Date();
    }
  }
  if (payload.is_primary !== undefined) {
    changes.isPrimary = payload.is_primary;
  }

  await sequelize.transaction(async (transaction) => {
    await membership.update(changes, { transaction });
    if (payload.is_primary) {
      await setPrimaryExclusively(membership.userId, membership.id, { transaction });
    }
    await recordAuditLog(
      {
        actorUserId: actorUser.internalId,
        action: 'MEMBERSHIP_STATUS_CHANGED',
        entityType: 'UniversityMembership',
        entityId: membership.id,
        universityId: membership.universityId,
        metadata: { from: previousStatus, to: changes.status || previousStatus },
      },
      { transaction }
    );
  });

  return serializeMembership(await findByPublicId(membershipUuid));
};

/** §25: foundation only — a safe, limited view of a user's institutional affiliations. */
const listUserMemberships = async (userUuid, { onlyActive = false } = {}) => {
  const user = await User.findOne({ where: { uuid: userUuid } });
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const where = { userId: user.id };
  if (onlyActive) {
    where.status = MEMBERSHIP_STATUS.ACTIVE;
  }

  const memberships = await UniversityMembership.findAll({
    where,
    include: [{ association: 'university' }],
    order: [
      ['isPrimary', 'DESC'],
      ['createdAt', 'ASC'],
    ],
  });

  return memberships.map((m) => serializeMembership(m));
};

module.exports = { listMemberships, createMembership, updateMembership, listUserMemberships, findByPublicId };
