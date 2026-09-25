const { Router } = require('express');

const validate = require('../../middleware/validate');
const requireAuth = require('../auth/auth.middleware');
const { requirePermission } = require('../auth/rbac.middleware');
const controller = require('./department.controller');
const { updateDepartmentSchema, updateStatusSchema } = require('./institution.validator');

const router = Router();

router.get('/:id', controller.getOne);

router.put(
  '/:id',
  requireAuth,
  requirePermission('DEPARTMENT_UPDATE'),
  validate(updateDepartmentSchema),
  controller.update
);

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('DEPARTMENT_STATUS_UPDATE'),
  validate(updateStatusSchema),
  controller.updateStatus
);

module.exports = router;
