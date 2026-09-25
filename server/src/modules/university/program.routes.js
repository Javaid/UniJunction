const { Router } = require('express');

const validate = require('../../middleware/validate');
const requireAuth = require('../auth/auth.middleware');
const { requirePermission } = require('../auth/rbac.middleware');
const controller = require('./program.controller');
const { updateProgramSchema, updateStatusSchema } = require('./institution.validator');

const router = Router();

router.get('/:id', controller.getOne);

router.put(
  '/:id',
  requireAuth,
  requirePermission('PROGRAM_UPDATE'),
  validate(updateProgramSchema),
  controller.update
);

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission('PROGRAM_STATUS_UPDATE'),
  validate(updateStatusSchema),
  controller.updateStatus
);

module.exports = router;
