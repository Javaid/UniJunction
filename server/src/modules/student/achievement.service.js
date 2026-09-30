const { StudentAchievement } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { requireOwnProfile } = require('./student-profile.service');
const { serializeAchievement } = require('./student-profile.serializer');

const findOwnAchievement = async (studentProfileId, achievementUuid) => {
  const achievement = await StudentAchievement.findOne({ where: { uuid: achievementUuid, studentProfileId } });
  if (!achievement) {
    throw new ApiError(404, 'Achievement not found.');
  }
  return achievement;
};

const listMyAchievements = async (actorUser) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const achievements = await StudentAchievement.findAll({
    where: { studentProfileId: profile.id },
    order: [['achievementDate', 'DESC']],
  });
  return achievements.map(serializeAchievement);
};

const createAchievement = async (actorUser, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const achievement = await StudentAchievement.create({
    studentProfileId: profile.id,
    title: payload.title,
    description: payload.description || null,
    organization: payload.organization || null,
    achievementDate: payload.achievement_date || null,
    url: payload.url || null,
  });
  return serializeAchievement(achievement);
};

const updateAchievement = async (actorUser, achievementUuid, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const achievement = await findOwnAchievement(profile.id, achievementUuid);

  const changes = {};
  if (payload.title !== undefined) changes.title = payload.title;
  if (payload.description !== undefined) changes.description = payload.description || null;
  if (payload.organization !== undefined) changes.organization = payload.organization || null;
  if (payload.achievement_date !== undefined) changes.achievementDate = payload.achievement_date || null;
  if (payload.url !== undefined) changes.url = payload.url || null;

  await achievement.update(changes);
  return serializeAchievement(achievement);
};

const deleteAchievement = async (actorUser, achievementUuid) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const achievement = await findOwnAchievement(profile.id, achievementUuid);
  await achievement.destroy();
};

module.exports = { listMyAchievements, createAchievement, updateAchievement, deleteAchievement };
