const skillService = require('./skill.service');

const list = async (req, res, next) => {
  try {
    const { skills, pagination } = await skillService.listSkills(req.query);
    res.status(200).json({ success: true, data: skills, pagination });
  } catch (error) {
    next(error);
  }
};

const add = async (req, res, next) => {
  try {
    const skill = await skillService.addStudentSkill(req.user, req.body);
    res.status(201).json({ success: true, data: skill });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const skill = await skillService.updateStudentSkill(req.user, req.params.skillId, req.body);
    res.status(200).json({ success: true, data: skill });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await skillService.removeStudentSkill(req.user, req.params.skillId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { list, add, update, remove };
