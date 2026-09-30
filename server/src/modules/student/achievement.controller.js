const achievementService = require('./achievement.service');

const list = async (req, res, next) => {
  try {
    const achievements = await achievementService.listMyAchievements(req.user);
    res.status(200).json({ success: true, data: achievements });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const achievement = await achievementService.createAchievement(req.user, req.body);
    res.status(201).json({ success: true, data: achievement });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const achievement = await achievementService.updateAchievement(req.user, req.params.id, req.body);
    res.status(200).json({ success: true, data: achievement });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await achievementService.deleteAchievement(req.user, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, update, remove };
