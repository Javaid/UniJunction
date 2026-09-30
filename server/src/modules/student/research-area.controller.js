const researchAreaService = require('./research-area.service');

const list = async (req, res, next) => {
  try {
    const areas = await researchAreaService.listResearchAreas(req.query);
    res.status(200).json({ success: true, data: areas });
  } catch (error) {
    next(error);
  }
};

const add = async (req, res, next) => {
  try {
    const interest = await researchAreaService.addStudentResearchInterest(req.user, req.body);
    res.status(201).json({ success: true, data: interest });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await researchAreaService.removeStudentResearchInterest(req.user, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = { list, add, remove };
