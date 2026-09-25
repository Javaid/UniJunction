const programService = require('./program.service');

const list = async (req, res, next) => {
  try {
    const { programs, pagination } = await programService.listPrograms(req.university, req.query);
    res.status(200).json({ success: true, data: programs, pagination });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const program = await programService.getProgram(req.params.id);
    res.status(200).json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const program = await programService.createProgram(req.university, req.body, req.user);
    res.status(201).json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const program = await programService.updateProgram(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const program = await programService.updateProgramStatus(req.params.id, req.body.status, req.user);
    res.status(200).json({ success: true, data: program });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getOne, create, update, updateStatus };
