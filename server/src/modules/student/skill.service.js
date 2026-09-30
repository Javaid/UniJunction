const { Op } = require('sequelize');
const { Skill, StudentSkill } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { CATALOG_STATUS } = require('../../utils/enums');
const { requireOwnProfile } = require('./student-profile.service');
const { serializeSkill } = require('./student-profile.serializer');

const serializeCatalogSkill = (skill) => {
  const plain = skill.toJSON ? skill.toJSON() : skill;
  return { id: plain.uuid, name: plain.name, slug: plain.slug, category: plain.category };
};

/** §28: the public skill catalog — always ACTIVE-only (no admin catalog management UI exists in this chunk). */
const listSkills = async ({ page, pageSize, search, category }) => {
  const where = { status: CATALOG_STATUS.ACTIVE };
  if (category) where.category = category;
  if (search) where.name = { [Op.like]: `%${search}%` };

  const { rows, count } = await Skill.findAndCountAll({
    where,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['name', 'ASC']],
  });

  return {
    skills: rows.map(serializeCatalogSkill),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) || 0 },
  };
};

const findActiveSkill = async (skillUuid) => {
  const skill = await Skill.findOne({ where: { uuid: skillUuid, status: CATALOG_STATUS.ACTIVE } });
  if (!skill) {
    throw new ApiError(404, 'Skill not found.');
  }
  return skill;
};

// Deliberately no status filter: a student must still be able to view/
// update/remove a skill they already added even if the catalog entry
// was later deactivated — only *adding a new* skill requires it to be
// currently ACTIVE (see findActiveSkill, used only by addStudentSkill).
const findSkillByUuid = async (skillUuid) => {
  const skill = await Skill.findOne({ where: { uuid: skillUuid } });
  if (!skill) {
    throw new ApiError(404, 'Skill not found.');
  }
  return skill;
};

const findStudentSkill = async (studentProfileId, skillId) => {
  const studentSkill = await StudentSkill.findOne({
    where: { studentProfileId, skillId },
    include: [{ association: 'skill' }],
  });
  if (!studentSkill) {
    throw new ApiError(404, 'You have not added this skill to your profile.');
  }
  return studentSkill;
};

/** §16/§28: students add their own skills only; duplicates are rejected (409), never silently merged. */
const addStudentSkill = async (actorUser, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const skill = await findActiveSkill(payload.skill_id);

  const existing = await StudentSkill.findOne({ where: { studentProfileId: profile.id, skillId: skill.id } });
  if (existing) {
    throw new ApiError(409, 'This skill is already on your profile.');
  }

  try {
    await StudentSkill.create({
      studentProfileId: profile.id,
      skillId: skill.id,
      proficiencyLevel: payload.proficiency_level,
      yearsExperience: payload.years_experience ?? null,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'This skill is already on your profile.');
    }
    throw error;
  }

  return serializeSkill(await findStudentSkill(profile.id, skill.id));
};

const updateStudentSkill = async (actorUser, skillUuid, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const skill = await findSkillByUuid(skillUuid);
  const studentSkill = await findStudentSkill(profile.id, skill.id);

  const changes = {};
  if (payload.proficiency_level !== undefined) changes.proficiencyLevel = payload.proficiency_level;
  if (payload.years_experience !== undefined) changes.yearsExperience = payload.years_experience;
  await studentSkill.update(changes);

  return serializeSkill(studentSkill);
};

const removeStudentSkill = async (actorUser, skillUuid) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const skill = await findSkillByUuid(skillUuid);
  const studentSkill = await findStudentSkill(profile.id, skill.id);
  await studentSkill.destroy();
};

module.exports = { listSkills, addStudentSkill, updateStudentSkill, removeStudentSkill };
