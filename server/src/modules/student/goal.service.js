const { StudentGoal } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { requireOwnProfile } = require('./student-profile.service');
const { serializeGoal } = require('./student-profile.serializer');

const findOwnGoal = async (studentProfileId, goalUuid) => {
  const goal = await StudentGoal.findOne({ where: { uuid: goalUuid, studentProfileId } });
  if (!goal) {
    throw new ApiError(404, 'Goal not found.');
  }
  return goal;
};

const listMyGoals = async (actorUser) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const goals = await StudentGoal.findAll({
    where: { studentProfileId: profile.id },
    order: [['createdAt', 'DESC']],
  });
  return goals.map(serializeGoal);
};

const createGoal = async (actorUser, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const goal = await StudentGoal.create({
    studentProfileId: profile.id,
    goalType: payload.goal_type,
    title: payload.title,
    description: payload.description || null,
    targetDate: payload.target_date || null,
    status: payload.status,
  });
  return serializeGoal(goal);
};

const updateGoal = async (actorUser, goalUuid, payload) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const goal = await findOwnGoal(profile.id, goalUuid);

  const changes = {};
  if (payload.goal_type !== undefined) changes.goalType = payload.goal_type;
  if (payload.title !== undefined) changes.title = payload.title;
  if (payload.description !== undefined) changes.description = payload.description || null;
  if (payload.target_date !== undefined) changes.targetDate = payload.target_date || null;
  if (payload.status !== undefined) changes.status = payload.status;

  await goal.update(changes);
  return serializeGoal(goal);
};

const deleteGoal = async (actorUser, goalUuid) => {
  const profile = await requireOwnProfile(actorUser.internalId);
  const goal = await findOwnGoal(profile.id, goalUuid);
  await goal.destroy();
};

module.exports = { listMyGoals, createGoal, updateGoal, deleteGoal };
