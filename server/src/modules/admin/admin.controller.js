const adminService = require('./admin.service');

const listUsers = async (req, res, next) => {
  try {
    const { users, pagination } = await adminService.listUsers(req.query);
    res.status(200).json({ success: true, data: users, pagination });
  } catch (error) {
    next(error);
  }
};

const assignRole = async (req, res, next) => {
  try {
    const user = await adminService.assignRole(req.params.userId, req.body.role);
    res.status(201).json({ success: true, message: 'Role assigned.', user });
  } catch (error) {
    next(error);
  }
};

const removeRole = async (req, res, next) => {
  try {
    const user = await adminService.removeRole(req.params.userId, req.params.role.toUpperCase());
    res.status(200).json({ success: true, message: 'Role removed.', user });
  } catch (error) {
    next(error);
  }
};

module.exports = { listUsers, assignRole, removeRole };
