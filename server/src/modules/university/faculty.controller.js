const facultyService = require('./faculty.service');

const list = async (req, res, next) => {
  try {
    const { faculties, pagination } = await facultyService.listFaculties(req.university, req.query);
    res.status(200).json({ success: true, data: faculties, pagination });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const faculty = await facultyService.getFaculty(req.params.id);
    res.status(200).json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const faculty = await facultyService.createFaculty(req.university, req.body, req.user);
    res.status(201).json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const faculty = await facultyService.updateFaculty(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const faculty = await facultyService.updateFacultyStatus(req.params.id, req.body.status, req.user);
    res.status(200).json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getOne, create, update, updateStatus };
