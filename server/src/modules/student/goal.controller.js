const goalService = require('./goal.service');

const list = async (req, res, next) => {
  try {
    const goals = await goalService.listMyGoals(req.user);
    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const goal = await goalService.createGoal(req.user, req.body);
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const goal = await goalService.updateGoal(req.user, req.params.id, req.body);
    res.status(200).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await goalService.deleteGoal(req.user, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { list, create, update, remove };
