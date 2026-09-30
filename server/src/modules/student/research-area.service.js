const { Op } = require('sequelize');
const { ResearchArea, StudentResearchInterest } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { CATALOG_STATUS } = require('../../utils/enums');
const { requireOwnProfile } = require('./student-profile.service');
const { serializeResearchInterest } = require('./student-profile.serializer');

const serializeCatalogResearchArea = (area) => {
  const plain = area.toJSON ? area.toJSON() : area;
  return {
    id: plain.uuid,
    name: plain.name,
    slug: plain.slug,
    parent_id: plain.parent?.uuid ?? null,
    description: plain.description,
  };
};

/** §18/§30: flat listing (each row carries its own parent's uuid), optionally scoped to one parent's direct children. */
const listResearchAreas = async ({ search, parent_id: parentUuid }) => {
  const where = { status: CATALOG_STATUS.ACTIVE };
  if (search) where.name = { [Op.like]: `%${search}%` };

  if (parentUuid) {
    const parent = await ResearchArea.findOne({ where: { uuid: parentUuid } });
    if (!parent) {
      throw new ApiError(404, 'Research area not found.');
    }
    where.parentId = parent.id;
  }

  const areas = await ResearchArea.findAll({
    where,
    include: [{ association: 'parent' }],
    order: [['name', 'ASC']],
  });

  return areas.map(serializeCatalogResearchArea);
};

const findActiveResearchArea = async (areaUuid) => {
  const area = await ResearchArea.findOne({ where: { uuid: areaUuid, status: CATALOG_STATUS.ACTIVE } });
  if (!area) {
    throw new ApiError(404, 'Research area not found.');
  }
  return area;
};

// See skill.service.js's findSkillByUuid for why removal isn't gated on ACTIVE.
const findResearchAreaByUuid = async (areaUuid) => {
  const area = await ResearchArea.findOne({ where: { uuid: areaUuid } });
  if (!area) {
    throw new ApiError(404, 'Research area not found.');
  }
  return area;
};

const addStudentResearchInterest = async (actorUser, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const area = await findActiveResearchArea(payload.research_area_id);

  const existing = await StudentResearchInterest.findOne({
    where: { studentProfileId: profile.id, researchAreaId: area.id },
  });
  if (existing) {
    throw new ApiError(409, 'This research area is already on your profile.');
  }

  try {
    await StudentResearchInterest.create({
      studentProfileId: profile.id,
      researchAreaId: area.id,
      interestLevel: payload.interest_level,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'This research area is already on your profile.');
    }
    throw error;
  }

  const created = await StudentResearchInterest.findOne({
    where: { studentProfileId: profile.id, researchAreaId: area.id },
    include: [{ association: 'researchArea' }],
  });
  return serializeResearchInterest(created);
};

const removeStudentResearchInterest = async (actorUser, areaUuid) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const area = await findResearchAreaByUuid(areaUuid);
  const studentResearchInterest = await StudentResearchInterest.findOne({
    where: { studentProfileId: profile.id, researchAreaId: area.id },
  });
  if (!studentResearchInterest) {
    throw new ApiError(404, 'You have not added this research area to your profile.');
  }
  await studentResearchInterest.destroy();
};

module.exports = { listResearchAreas, addStudentResearchInterest, removeStudentResearchInterest };
