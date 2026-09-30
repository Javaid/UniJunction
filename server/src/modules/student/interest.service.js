const { Op } = require('sequelize');
const { Interest, StudentInterest } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { CATALOG_STATUS } = require('../../utils/enums');
const { requireOwnProfile } = require('./student-profile.service');
const { serializeInterest } = require('./student-profile.serializer');

const serializeCatalogInterest = (interest) => {
  const plain = interest.toJSON ? interest.toJSON() : interest;
  return { id: plain.uuid, name: plain.name, slug: plain.slug, category: plain.category };
};

/** §29: the public academic-interest catalog — always ACTIVE-only. */
const listInterests = async ({ page, pageSize, search, category }) => {
  const where = { status: CATALOG_STATUS.ACTIVE };
  if (category) where.category = category;
  if (search) where.name = { [Op.like]: `%${search}%` };

  const { rows, count } = await Interest.findAndCountAll({
    where,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['name', 'ASC']],
  });

  return {
    interests: rows.map(serializeCatalogInterest),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 0 },
  };
};

const findActiveInterest = async (interestUuid) => {
  const interest = await Interest.findOne({ where: { uuid: interestUuid, status: CATALOG_STATUS.ACTIVE } });
  if (!interest) {
    throw new ApiError(404, 'Interest not found.');
  }
  return interest;
};

// See skill.service.js's findSkillByUuid for why removal isn't gated on ACTIVE.
const findInterestByUuid = async (interestUuid) => {
  const interest = await Interest.findOne({ where: { uuid: interestUuid } });
  if (!interest) {
    throw new ApiError(404, 'Interest not found.');
  }
  return interest;
};

const findStudentInterest = async (studentProfileId, interestId) => {
  const studentInterest = await StudentInterest.findOne({
    where: { studentProfileId, interestId },
    include: [{ association: 'interest' }],
  });
  if (!studentInterest) {
    throw new ApiError(404, 'You have not added this interest to your profile.');
  }
  return studentInterest;
};

const addStudentInterest = async (actorUser, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const interest = await findActiveInterest(payload.interest_id);

  const existing = await StudentInterest.findOne({
    where: { studentProfileId: profile.id, interestId: interest.id },
  });
  if (existing) {
    throw new ApiError(409, 'This interest is already on your profile.');
  }

  try {
    await StudentInterest.create({ studentProfileId: profile.id, interestId: interest.id });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'This interest is already on your profile.');
    }
    throw error;
  }

  return serializeInterest(await findStudentInterest(profile.id, interest.id));
};

const removeStudentInterest = async (actorUser, interestUuid) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const interest = await findInterestByUuid(interestUuid);
  const studentInterest = await StudentInterest.findOne({
    where: { studentProfileId: profile.id, interestId: interest.id },
  });
  if (!studentInterest) {
    throw new ApiError(404, 'You have not added this interest to your profile.');
  }
  await studentInterest.destroy();
};

module.exports = { listInterests, addStudentInterest, removeStudentInterest };
