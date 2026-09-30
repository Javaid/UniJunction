const { Op } = require('sequelize');
const { Language, StudentLanguage } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { CATALOG_STATUS } = require('../../utils/enums');
const { requireOwnProfile } = require('./student-profile.service');
const { serializeLanguage } = require('./student-profile.serializer');

const serializeCatalogLanguage = (language) => {
  const plain = language.toJSON ? language.toJSON() : language;
  return { id: plain.uuid, name: plain.name, code: plain.code };
};

/** §31: the public language catalog — always ACTIVE-only. Small enough to return unpaginated. */
const listLanguages = async ({ search }) => {
  const where = { status: CATALOG_STATUS.ACTIVE };
  if (search) where.name = { [Op.like]: `%${search}%` };

  const languages = await Language.findAll({ where, order: [['name', 'ASC']] });
  return languages.map(serializeCatalogLanguage);
};

const findActiveLanguage = async (languageUuid) => {
  const language = await Language.findOne({ where: { uuid: languageUuid, status: CATALOG_STATUS.ACTIVE } });
  if (!language) {
    throw new ApiError(404, 'Language not found.');
  }
  return language;
};

// See skill.service.js's findSkillByUuid for why update/removal isn't gated on ACTIVE.
const findLanguageByUuid = async (languageUuid) => {
  const language = await Language.findOne({ where: { uuid: languageUuid } });
  if (!language) {
    throw new ApiError(404, 'Language not found.');
  }
  return language;
};

const findStudentLanguage = async (studentProfileId, languageId) => {
  const studentLanguage = await StudentLanguage.findOne({
    where: { studentProfileId, languageId },
    include: [{ association: 'language' }],
  });
  if (!studentLanguage) {
    throw new ApiError(404, 'You have not added this language to your profile.');
  }
  return studentLanguage;
};

const addStudentLanguage = async (actorUser, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const language = await findActiveLanguage(payload.language_id);

  const existing = await StudentLanguage.findOne({
    where: { studentProfileId: profile.id, languageId: language.id },
  });
  if (existing) {
    throw new ApiError(409, 'This language is already on your profile.');
  }

  try {
    await StudentLanguage.create({
      studentProfileId: profile.id,
      languageId: language.id,
      proficiencyLevel: payload.proficiency_level,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'This language is already on your profile.');
    }
    throw error;
  }

  return serializeLanguage(await findStudentLanguage(profile.id, language.id));
};

const updateStudentLanguage = async (actorUser, languageUuid, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const language = await findLanguageByUuid(languageUuid);
  const studentLanguage = await findStudentLanguage(profile.id, language.id);

  await studentLanguage.update({ proficiencyLevel: payload.proficiency_level });
  return serializeLanguage(studentLanguage);
};

const removeStudentLanguage = async (actorUser, languageUuid) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const language = await findLanguageByUuid(languageUuid);
  const studentLanguage = await findStudentLanguage(profile.id, language.id);
  await studentLanguage.destroy();
};

module.exports = { listLanguages, addStudentLanguage, updateStudentLanguage, removeStudentLanguage };
