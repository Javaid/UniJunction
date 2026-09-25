const departmentService = require('./department.service');

const list = async (req, res, next) => {
  try {
    const { departments, pagination } = await departmentService.listDepartments(req.university, req.query);
    res.status(200).json({ success: true, data: departments, pagination });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const department = await departmentService.getDepartment(req.params.id);
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const department = await departmentService.createDepartment(req.university, req.body, req.user);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const department = await departmentService.updateDepartmentStatus(req.params.id, req.body.status, req.user);
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, getOne, create, update, updateStatus };
